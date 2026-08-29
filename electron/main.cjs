const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('xlsx');

let mainWindow, db, dbPath, attachmentsDir, storageRoot;
let importSession = null;
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });

function defaultStorageRoot(){ return path.join(app.getPath('userData'), 'archive-data'); }
function storageLocatorPath(){ return path.join(app.getPath('userData'), 'storage-location.json'); }
function readConfiguredStorageRoot(){
  try {
    const cfg=JSON.parse(fs.readFileSync(storageLocatorPath(),'utf8'));
    if(cfg?.storageRoot && path.isAbsolute(cfg.storageRoot)) return cfg.storageRoot;
  } catch {}
  return defaultStorageRoot();
}
function writeConfiguredStorageRoot(root){
  fs.mkdirSync(app.getPath('userData'),{recursive:true});
  fs.writeFileSync(storageLocatorPath(),JSON.stringify({storageRoot:root},null,2),'utf8');
}
function closeDatabase(){
  if(!db) return;
  try{db.exec('PRAGMA wal_checkpoint(FULL);')}catch{}
  try{db.close()}catch{}
  db=null;
}
function repairAttachmentPaths(){
  try{
    const atts=db.prepare('SELECT id, stored_path FROM attachments').all();
    const update=db.prepare('UPDATE attachments SET stored_path=$path WHERE id=$id');
    for(const a of atts){
      const candidate=path.join(attachmentsDir,path.basename(a.stored_path||''));
      if(candidate!==a.stored_path && fs.existsSync(candidate)) update.run({$path:candidate,$id:a.id});
    }
  }catch{}
}
function openStorage(root){
  storageRoot=root;
  attachmentsDir=path.join(storageRoot,'attachments');
  fs.mkdirSync(attachmentsDir,{recursive:true});
  dbPath=path.join(storageRoot,'deeds.sqlite');
  db=new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS deeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_number TEXT NOT NULL,
      document_date TEXT NOT NULL DEFAULT '',
      owner_name TEXT NOT NULL,
      property_type TEXT NOT NULL DEFAULT '',
      property_area TEXT NOT NULL DEFAULT '',
      plot_number TEXT NOT NULL DEFAULT '',
      plan_number TEXT NOT NULL DEFAULT '',
      district TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      held_by TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deed_id INTEGER NOT NULL,
      original_name TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime_group TEXT NOT NULL DEFAULT 'file',
      created_at TEXT NOT NULL,
      FOREIGN KEY(deed_id) REFERENCES deeds(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_deeds_document ON deeds(document_number);
    CREATE INDEX IF NOT EXISTS idx_deeds_owner ON deeds(owner_name);
    CREATE INDEX IF NOT EXISTS idx_deeds_city ON deeds(city);
    CREATE INDEX IF NOT EXISTS idx_deeds_held ON deeds(held_by);
  `);
  repairAttachmentPaths();
}
function ensureStorage(){ openStorage(readConfiguredStorageRoot()); }
function getStorageInfo(){
  const same=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
  return {storageRoot,dbPath,attachmentsDir,isDefault:same(storageRoot,defaultStorageRoot())};
}
async function chooseStorageLocation(){
  const pick=await dialog.showOpenDialog(mainWindow,{title:'اختر مكان حفظ بيانات الصكوك',properties:['openDirectory','createDirectory']});
  if(pick.canceled||!pick.filePaths[0]) return {canceled:true,...getStorageInfo()};
  const chosen=pick.filePaths[0];
  const target=path.basename(chosen).toLowerCase()==='deedarchivedata'?chosen:path.join(chosen,'DeedArchiveData');
  const same=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();
  if(same(target,storageRoot)) return {canceled:false,unchanged:true,...getStorageInfo()};
  const oldRoot=storageRoot, oldDb=dbPath, oldAttachments=attachmentsDir;
  let mode='copy';
  if(fs.existsSync(path.join(target,'deeds.sqlite'))){
    const answer=await dialog.showMessageBox(mainWindow,{type:'question',title:'مجلد بيانات موجود',message:'المجلد المختار يحتوي بالفعل على قاعدة بيانات للصكوك.',detail:'هل تريد استخدام البيانات الموجودة في هذا المجلد أم استبدالها بنسخة من بيانات البرنامج الحالية؟',buttons:['استخدام البيانات الموجودة','استبدالها بالبيانات الحالية','إلغاء'],defaultId:0,cancelId:2,noLink:true});
    if(answer.response===2) return {canceled:true,...getStorageInfo()};
    mode=answer.response===0?'existing':'copy';
  }
  if(mode==='copy'){
    try{db.exec('PRAGMA wal_checkpoint(FULL);')}catch{}
    fs.mkdirSync(target,{recursive:true});
    fs.mkdirSync(path.join(target,'attachments'),{recursive:true});
    if(fs.existsSync(oldDb)) fs.copyFileSync(oldDb,path.join(target,'deeds.sqlite'));
    if(fs.existsSync(oldAttachments)) fs.cpSync(oldAttachments,path.join(target,'attachments'),{recursive:true,force:true});
    const oldUpdate=path.join(oldRoot,'update-settings.json');
    if(fs.existsSync(oldUpdate)) fs.copyFileSync(oldUpdate,path.join(target,'update-settings.json'));
  }
  closeDatabase();
  openStorage(target);
  writeConfiguredStorageRoot(target);
  return {canceled:false,migrated:mode==='copy',usedExisting:mode==='existing',...getStorageInfo()};
}
const rows = (sql, params={}) => db.prepare(sql).all(params);
const row = (sql, params={}) => db.prepare(sql).get(params);

function listDeeds(filters = {}) {
  const where = [], params = {};
  const search = String(filters.search || '').trim();
  if (search) {
    where.push(`(document_number LIKE $search OR document_date LIKE $search OR owner_name LIKE $search OR property_type LIKE $search OR property_area LIKE $search OR plot_number LIKE $search OR plan_number LIKE $search OR district LIKE $search OR city LIKE $search OR held_by LIKE $search)`);
    params.$search = `%${search}%`;
  }
  for (const [key,col] of [['city','city'],['district','district'],['propertyType','property_type'],['heldBy','held_by'],['owner','owner_name']]) {
    const value = String(filters[key] || '').trim();
    if (value) { where.push(`${col} = $${key}`); params[`$${key}`] = value; }
  }
  const browseMap={document_number:'document_number',document_date:'document_date',owner_name:'owner_name',property_type:'property_type',property_area:'property_area',plot_number:'plot_number',plan_number:'plan_number',district:'district',city:'city',held_by:'held_by'};
  const browseKey=String(filters.browseKey||'').trim(),browseValue=String(filters.browseValue||'').trim();
  if(browseKey&&browseValue&&browseMap[browseKey]){where.push(`${browseMap[browseKey]} = $browseValue`);params.$browseValue=browseValue;}
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = row(`SELECT COUNT(*) AS n FROM deeds ${clause}`, params)?.n || 0;
  const pageSize = Math.max(5, Math.min(5000, Number(filters.pageSize || 12)));
  const page = Math.max(1, Number(filters.page || 1));
  params.$limit = pageSize; params.$offset = (page - 1) * pageSize;
  const items = rows(`SELECT d.*, (SELECT COUNT(*) FROM attachments a WHERE a.deed_id=d.id) AS attachment_count FROM deeds d ${clause} ORDER BY d.id DESC LIMIT $limit OFFSET $offset`, params);
  return { items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}
function getDeed(id) {
  const deed = row('SELECT * FROM deeds WHERE id=$id', { $id:Number(id) });
  if (!deed) return null;
  deed.attachments = rows('SELECT * FROM attachments WHERE deed_id=$id ORDER BY id DESC', { $id:Number(id) });
  return deed;
}
function normalizePayload(payload={}) {
  return {
    document_number:String(payload.document_number||'').trim(), document_date:String(payload.document_date||'').trim(),
    owner_name:String(payload.owner_name||'').trim(), property_type:String(payload.property_type||'').trim(),
    property_area:String(payload.property_area||'').trim(), plot_number:String(payload.plot_number||'').trim(),
    plan_number:String(payload.plan_number||'').trim(), district:String(payload.district||'').trim(), city:String(payload.city||'').trim(),
    held_by:String(payload.held_by||'').trim(), notes:String(payload.notes||'').trim()
  };
}
function insertDeed(v) {
  const now = new Date().toISOString();
  const result = db.prepare(`INSERT INTO deeds (document_number,document_date,owner_name,property_type,property_area,plot_number,plan_number,district,city,held_by,notes,created_at,updated_at)
    VALUES ($document_number,$document_date,$owner_name,$property_type,$property_area,$plot_number,$plan_number,$district,$city,$held_by,$notes,$created_at,$updated_at)`).run({
      ...Object.fromEntries(Object.entries(v).map(([k,val])=>[`$${k}`,val])), $created_at:now, $updated_at:now
    });
  return Number(result.lastInsertRowid);
}
function saveDeed(payload) {
  const v = normalizePayload(payload);
  if (!v.document_number || !v.owner_name) throw new Error('رقم الوثيقة واسم المالك مطلوبان.');
  let id = Number(payload.id||0), now = new Date().toISOString();
  if (id) db.prepare(`UPDATE deeds SET document_number=$document_number, document_date=$document_date, owner_name=$owner_name, property_type=$property_type, property_area=$property_area, plot_number=$plot_number, plan_number=$plan_number, district=$district, city=$city, held_by=$held_by, notes=$notes, updated_at=$updated_at WHERE id=$id`).run({
    ...Object.fromEntries(Object.entries(v).map(([k,val])=>[`$${k}`,val])), $updated_at:now, $id:id
  });
  else id = insertDeed(v);
  return getDeed(id);
}
function copyAttachment(deedId,filePath){
  const ext=path.extname(filePath), storedName=`${deedId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`, dest=path.join(attachmentsDir,storedName);
  fs.copyFileSync(filePath,dest);
  const imageExt=new Set(['.png','.jpg','.jpeg','.webp','.gif','.bmp']);
  const mimeGroup=imageExt.has(ext.toLowerCase())?'image':ext.toLowerCase()==='.pdf'?'pdf':'file';
  db.prepare(`INSERT INTO attachments (deed_id,original_name,stored_path,mime_group,created_at) VALUES ($deed_id,$original_name,$stored_path,$mime_group,$created_at)`).run({$deed_id:deedId,$original_name:path.basename(filePath),$stored_path:dest,$mime_group:mimeGroup,$created_at:new Date().toISOString()});
}
function attachmentData(a){
  if(!a || !fs.existsSync(a.stored_path)) return '';
  const ext=path.extname(a.stored_path).slice(1).toLowerCase();
  const mime=a.mime_group==='pdf'?'application/pdf':ext==='jpg'||ext==='jpeg'?'image/jpeg':ext==='webp'?'image/webp':ext==='gif'?'image/gif':ext==='bmp'?'image/bmp':'image/png';
  return `data:${mime};base64,${fs.readFileSync(a.stored_path).toString('base64')}`;
}
function filterOptions(){const pick=col=>rows(`SELECT DISTINCT ${col} AS value FROM deeds WHERE TRIM(${col})<>'' ORDER BY ${col}`).map(x=>x.value);return{cities:pick('city'),districts:pick('district'),propertyTypes:pick('property_type'),heldBy:pick('held_by'),owners:pick('owner_name')}}

function updateSettingsPath(){return path.join(storageRoot,'update-settings.json')}
function getUpdateSettings(){
  const defaults={owner:'',repo:'',autoCheck:true};
  try{return {...defaults,...JSON.parse(fs.readFileSync(updateSettingsPath(),'utf8'))}}catch{return defaults}
}
function saveUpdateSettings(s){const v={owner:String(s.owner||'').trim(),repo:String(s.repo||'').trim(),autoCheck:!!s.autoCheck};fs.writeFileSync(updateSettingsPath(),JSON.stringify(v,null,2));return v}
function cleanVersion(v){return String(v||'').trim().replace(/^v/i,'').split('-')[0]}
function compareVersions(a,b){const pa=cleanVersion(a).split('.').map(Number),pb=cleanVersion(b).split('.').map(Number);for(let i=0;i<Math.max(pa.length,pb.length);i++){const x=pa[i]||0,y=pb[i]||0;if(x>y)return 1;if(x<y)return-1}return 0}
function githubJson(url){return new Promise((resolve,reject)=>{https.get(url,{headers:{'User-Agent':'DeedArchive-Updater','Accept':'application/vnd.github+json'}},res=>{let data='';res.on('data',d=>data+=d);res.on('end',()=>{if(res.statusCode>=200&&res.statusCode<300){try{resolve(JSON.parse(data))}catch(e){reject(e)}}else reject(new Error(`GitHub HTTP ${res.statusCode}`))})}).on('error',reject)})}
async function checkUpdate(settings=getUpdateSettings()){
  if(!settings.owner||!settings.repo)return{configured:false,currentVersion:app.getVersion()};
  const release=await githubJson(`https://api.github.com/repos/${encodeURIComponent(settings.owner)}/${encodeURIComponent(settings.repo)}/releases/latest`);
  const latest=cleanVersion(release.tag_name||release.name), current=cleanVersion(app.getVersion());
  const asset=(release.assets||[]).find(a=>/portable.*\.exe$/i.test(a.name))||(release.assets||[]).find(a=>/\.exe$/i.test(a.name));
  return{configured:true,currentVersion:current,latestVersion:latest,hasUpdate:compareVersions(latest,current)>0,releaseName:release.name||release.tag_name,notes:release.body||'',asset:asset?{name:asset.name,url:asset.browser_download_url,size:asset.size}:null,htmlUrl:release.html_url};
}
function downloadFile(url,dest){return new Promise((resolve,reject)=>{const go=u=>{https.get(u,{headers:{'User-Agent':'DeedArchive-Updater'}},res=>{if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location)return go(res.headers.location);if(res.statusCode!==200)return reject(new Error(`Download HTTP ${res.statusCode}`));const out=fs.createWriteStream(dest);res.pipe(out);out.on('finish',()=>out.close(()=>resolve(dest)));out.on('error',reject)}).on('error',reject)};go(url)})}

function excelLetter(n){let s='';for(let x=n+1;x>0;x=Math.floor((x-1)/26))s=String.fromCharCode(65+(x-1)%26)+s;return s}
function excelCellText(cell){
  if(!cell||cell.v===undefined||cell.v===null)return'';
  try{return String(XLSX.utils.format_cell(cell)??'').trim()}catch{return String(cell.v??'').trim()}
}
function detectActualRange(ws){
  let minR=Infinity,minC=Infinity,maxR=-1,maxC=-1;
  for(const addr of Object.keys(ws)){
    if(addr.startsWith('!'))continue;
    const text=excelCellText(ws[addr]);
    if(!text)continue;
    let pos;try{pos=XLSX.utils.decode_cell(addr)}catch{continue}
    minR=Math.min(minR,pos.r); minC=Math.min(minC,pos.c); maxR=Math.max(maxR,pos.r); maxC=Math.max(maxC,pos.c);
  }
  if(maxR<0||maxC<0)return null;
  return{s:{r:minR,c:minC},e:{r:maxR,c:maxC}};
}
function normalizeHeader(v){
  return String(v??'').trim().toLowerCase()
    .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي')
    .replace(/[\s_\-–—:：/\\.،,()\[\]]+/g,'');
}
const importAliases={
  document_number:['رقمالوثيقه','رقمالصك','رقموثيقه','documentnumber','deednumber'],
  document_date:['تاريخالوثيقه','تاريخالصك','documentdate','deeddate'],
  owner_name:['اسمالمالك','المالك','ownername','owner'],
  property_type:['نوعالعقار','propertytype'],
  property_area:['مساحهالعقار','المساحه','area','propertyarea'],
  plot_number:['رقمالقطعه','القطعه','plotnumber','plotno'],
  plan_number:['رقمالمخطط','المخطط','plannumber','planno'],
  district:['الحي','district','neighborhood'],
  city:['المدينه','city'],
  held_by:['الصكلدي','الوثيقهالدي','لدي','مرهونلدي','heldby','custodian'],
  notes:['ملاحظات','ملاحظه','notes','note']
};
function matchHeaderKey(value){
  const n=normalizeHeader(value); if(!n)return null;
  for(const [key,aliases] of Object.entries(importAliases)){
    if(aliases.some(a=>n===a||n.includes(a)||a.includes(n)))return key;
  }
  return null;
}
function suggestImportMapping(matrix){
  let bestRow=0,bestScore=-1,bestMap={};
  const limit=Math.min(matrix.length,20);
  for(let r=0;r<limit;r++){
    const map={},used=new Set(); let score=0;
    matrix[r].forEach((value,c)=>{const key=matchHeaderKey(value);if(key&&!used.has(key)){map[key]=c;used.add(key);score++}});
    if(score>bestScore){bestScore=score;bestRow=r;bestMap=map}
  }
  if(bestScore<2){const first=matrix.findIndex(row=>row.some(v=>String(v).trim()));bestRow=first>=0?first:0;bestMap={}}
  return{headerRow:bestRow,mapping:bestMap,matched:Math.max(0,bestScore)};
}
async function chooseImportFile(){
  const res=await dialog.showOpenDialog(mainWindow,{properties:['openFile'],filters:[{name:'Excel / CSV',extensions:['xlsx','xls','csv']}]});
  if(res.canceled||!res.filePaths[0])return{canceled:true};
  const filePath=res.filePaths[0];
  // Read sheet names only. Do not parse the full worksheet at this stage.
  const wb=XLSX.readFile(filePath,{bookSheets:true});
  const sheetNames=wb.SheetNames||[];
  if(!sheetNames.length)throw new Error('ملف Excel لا يحتوي على أوراق قابلة للقراءة.');
  importSession={id:Date.now().toString(36),filePath,sheetName:sheetNames[0],matrix:null,sourceStartRow:0,sourceStartCol:0};
  return{canceled:false,sessionId:importSession.id,fileName:path.basename(filePath),sheetNames,defaultSheet:sheetNames[0]};
}
function normalizeCellRef(value){
  return String(value||'').trim().toUpperCase().replace(/\$/g,'');
}
function parseImportRange(fromCell,toCell){
  const from=normalizeCellRef(fromCell),to=normalizeCellRef(toCell);
  if(!/^[A-Z]{1,3}[1-9]\d*$/.test(from)||!/^[A-Z]{1,3}[1-9]\d*$/.test(to))throw new Error('اكتب نطاقاً صحيحاً مثل A1 إلى J85.');
  const a=XLSX.utils.decode_cell(from),b=XLSX.utils.decode_cell(to);
  const s={r:Math.min(a.r,b.r),c:Math.min(a.c,b.c)},e={r:Math.max(a.r,b.r),c:Math.max(a.c,b.c)};
  const rowCount=e.r-s.r+1,colCount=e.c-s.c+1;
  if(rowCount>10000)throw new Error('النطاق أكبر من 10,000 صف. اختر نطاقاً أصغر.');
  if(colCount>100)throw new Error('النطاق أكبر من 100 عمود. اختر الأعمدة المطلوبة فقط.');
  return{s,e,rowCount,colCount,from:XLSX.utils.encode_cell(s),to:XLSX.utils.encode_cell(e)};
}
function loadImportRange({sessionId,sheetName,fromCell,toCell}){
  if(!importSession||importSession.id!==sessionId)throw new Error('انتهت جلسة الاستيراد. اختر الملف من جديد.');
  const range=parseImportRange(fromCell,toCell);
  const selectedSheet=String(sheetName||importSession.sheetName||'').trim();
  // sheetRows prevents XLSX from expanding the worksheet beyond the requested last row.
  const wb=XLSX.readFile(importSession.filePath,{cellDates:false,raw:false,sheetRows:range.e.r+1});
  if(!wb.SheetNames.includes(selectedSheet))throw new Error('ورقة Excel المحددة غير موجودة.');
  const ws=wb.Sheets[selectedSheet];
  const rawMatrix=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,range:{s:range.s,e:range.e},blankrows:true});
  const matrix=Array.from({length:range.rowCount},(_,ri)=>Array.from({length:range.colCount},(_,ci)=>String(rawMatrix?.[ri]?.[ci]??'').trim()));
  if(!matrix.some(r=>r.some(v=>v)))throw new Error('النطاق المحدد لا يحتوي على بيانات.');
  const suggestion=suggestImportMapping(matrix);
  importSession={...importSession,sheetName:selectedSheet,matrix,sourceStartRow:range.s.r,sourceStartCol:range.s.c,rangeFrom:range.from,rangeTo:range.to};
  return{
    sessionId:importSession.id,fileName:path.basename(importSession.filePath),sheetName:selectedSheet,
    rows:matrix.slice(0,100),columns:Array.from({length:range.colCount},(_,i)=>({index:i,letter:excelLetter(range.s.c+i)})),rowCount:matrix.length,
    sourceStartRow:range.s.r+1,sourceStartColumn:excelLetter(range.s.c),sourceEndColumn:excelLetter(range.e.c),rangeFrom:range.from,rangeTo:range.to,
    suggestedHeaderRow:suggestion.headerRow,suggestedMapping:suggestion.mapping,matchedHeaders:suggestion.matched
  };
}
function commitImport({sessionId,headerRow=0,mapping={},skipDuplicates=true}){
  if(!importSession||importSession.id!==sessionId)throw new Error('انتهت جلسة الاستيراد. اختر الملف من جديد.');
  const start=Math.max(0,Number(headerRow)+1), report={inserted:0,skipped:0,errors:[]};
  const validKeys=['document_number','document_date','owner_name','property_type','property_area','plot_number','plan_number','district','city','held_by','notes'];
  db.exec('BEGIN');
  try{
    for(let r=start;r<importSession.matrix.length;r++){
      const line=importSession.matrix[r];
      if(!line.some(v=>String(v).trim()))continue;
      const obj={};for(const k of validKeys){const idx=Number(mapping[k]);obj[k]=Number.isInteger(idx)&&idx>=0?String(line[idx]??'').trim():''}
      const v=normalizePayload(obj);
      const excelRow=(importSession.sourceStartRow||0)+r+1;
      if(!v.document_number||!v.owner_name){report.skipped++;report.errors.push(`صف Excel ${excelRow}: رقم الوثيقة أو اسم المالك فارغ`);continue}
      if(skipDuplicates&&row('SELECT id FROM deeds WHERE document_number=$n',{$n:v.document_number})){report.skipped++;continue}
      insertDeed(v);report.inserted++;
    }
    db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e}
  importSession=null;return report;
}

function createWindow(){
  mainWindow=new BrowserWindow({width:1600,height:940,minWidth:1180,minHeight:720,backgroundColor:'#E9E4D7',title:'إدارة الصكوك والعقارات',autoHideMenuBar:true,icon:path.join(__dirname,'..','build','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});
  const devUrl=process.env.VITE_DEV_SERVER_URL;if(devUrl)mainWindow.loadURL(devUrl);else mainWindow.loadFile(path.join(__dirname,'..','dist','index.html'));
  mainWindow.webContents.once('did-finish-load',async()=>{const s=getUpdateSettings();if(s.autoCheck&&s.owner&&s.repo){try{const status=await checkUpdate(s);mainWindow.webContents.send('update:status',status)}catch{}}});
}

app.whenReady().then(()=>{
  ensureStorage();
  ipcMain.handle('deeds:list',(_,f)=>listDeeds(f)); ipcMain.handle('deeds:get',(_,id)=>getDeed(id)); ipcMain.handle('deeds:save',(_,p)=>saveDeed(p));
  ipcMain.handle('deeds:delete',(_,id)=>{const atts=rows('SELECT stored_path FROM attachments WHERE deed_id=$id',{$id:Number(id)});db.prepare('DELETE FROM deeds WHERE id=$id').run({$id:Number(id)});for(const a of atts){try{if(fs.existsSync(a.stored_path))fs.unlinkSync(a.stored_path)}catch{}}return true});
  ipcMain.handle('attachments:choose',async(_,deedId)=>{if(!Number(deedId))throw new Error('احفظ الصك أولاً قبل إضافة المرفقات.');const res=await dialog.showOpenDialog(mainWindow,{properties:['openFile','multiSelections'],filters:[{name:'مستندات الصك',extensions:['png','jpg','jpeg','webp','bmp','pdf']}]});if(res.canceled)return getDeed(deedId);for(const p of res.filePaths)copyAttachment(Number(deedId),p);return getDeed(deedId)});
  ipcMain.handle('attachments:preview',(_,id)=>{const a=row('SELECT * FROM attachments WHERE id=$id',{$id:Number(id)});return a&&a.mime_group==='image'?attachmentData(a):''});
  ipcMain.handle('attachments:data',(_,id)=>{const a=row('SELECT * FROM attachments WHERE id=$id',{$id:Number(id)});return a?attachmentData(a):''});
  ipcMain.handle('attachments:open',(_,id)=>{const a=row('SELECT * FROM attachments WHERE id=$id',{$id:Number(id)});return a?shell.openPath(a.stored_path):''});
  ipcMain.handle('attachments:delete',(_,id)=>{const a=row('SELECT * FROM attachments WHERE id=$id',{$id:Number(id)});if(a){try{if(fs.existsSync(a.stored_path))fs.unlinkSync(a.stored_path)}catch{}db.prepare('DELETE FROM attachments WHERE id=$id').run({$id:Number(id)})}return true});
  ipcMain.handle('deeds:filter-options',()=>filterOptions());
  ipcMain.handle('storage:get-info',()=>getStorageInfo());
  ipcMain.handle('storage:choose-location',()=>chooseStorageLocation());
  ipcMain.handle('storage:open-folder',()=>shell.openPath(storageRoot));
  ipcMain.handle('print:landscape',async(event)=>new Promise((resolve)=>{
    event.sender.print({silent:false,printBackground:true,landscape:true,pageSize:'A4'},(success,failureReason)=>resolve({success,failureReason:failureReason||''}));
  }));
  ipcMain.handle('print:landscape-pdf',async(event,suggestedName='DeedArchive-report.pdf')=>{
    const pdf=await event.sender.printToPDF({printBackground:true,landscape:true,pageSize:'A4',preferCSSPageSize:false});
    const safeName=String(suggestedName||'DeedArchive-report.pdf').replace(/[\\/:*?"<>|]/g,'-');
    const result=await dialog.showSaveDialog(mainWindow,{title:'حفظ التقرير PDF',defaultPath:path.join(app.getPath('documents'),safeName.endsWith('.pdf')?safeName:`${safeName}.pdf`),filters:[{name:'PDF',extensions:['pdf']}]});
    if(result.canceled||!result.filePath)return{canceled:true};
    fs.writeFileSync(result.filePath,pdf);
    return{canceled:false,path:result.filePath};
  });
  ipcMain.handle('app:backup',async()=>{const target=await dialog.showOpenDialog(mainWindow,{properties:['openDirectory','createDirectory']});if(target.canceled||!target.filePaths[0])return{canceled:true};const stamp=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19),folder=path.join(target.filePaths[0],`DeedArchive-Backup-${stamp}`);fs.mkdirSync(folder,{recursive:true});db.exec('PRAGMA wal_checkpoint(FULL);');fs.copyFileSync(dbPath,path.join(folder,'deeds.sqlite'));fs.cpSync(attachmentsDir,path.join(folder,'attachments'),{recursive:true});fs.writeFileSync(path.join(folder,'README.txt'),'نسخة احتياطية من برنامج إدارة الصكوك والعقارات.\r\nتحتوي على قاعدة البيانات ومجلد المرفقات.');return{canceled:false,path:folder}});
  ipcMain.handle('import:choose',()=>chooseImportFile()); ipcMain.handle('import:load-range',(_,p)=>loadImportRange(p)); ipcMain.handle('import:commit',(_,p)=>commitImport(p));
  ipcMain.handle('updates:get-settings',()=>({...getUpdateSettings(),currentVersion:app.getVersion()})); ipcMain.handle('updates:save-settings',(_,s)=>saveUpdateSettings(s)); ipcMain.handle('updates:check',(_,s)=>checkUpdate(s||getUpdateSettings()));
  ipcMain.handle('updates:download',async(_,status)=>{if(!status?.asset?.url)throw new Error('لا يوجد ملف EXE مناسب في أحدث Release.');const dest=path.join(app.getPath('downloads'),status.asset.name||`DeedArchive-${status.latestVersion}.exe`);await downloadFile(status.asset.url,dest);shell.showItemInFolder(dest);return{path:dest}});
  createWindow(); app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
