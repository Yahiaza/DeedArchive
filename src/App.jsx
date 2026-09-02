import React,{useCallback,useEffect,useMemo,useState} from 'react';
import { Archive, Plus, Pencil, Printer, DatabaseBackup, Search, Building2, Trash2, FileSpreadsheet, RefreshCw, Eye, FolderCog, CalendarDays, Clock3, Save, LayoutDashboard } from 'lucide-react';
import { api } from './lib/api';
import Filters from './components/Filters';
import PreviewPanel from './components/PreviewPanel';
import DeedsTable from './components/DeedsTable';
import DeedForm from './components/DeedForm';
import Modal from './components/Modal';
import AttachmentViewer from './components/AttachmentViewer';
import PrintPreview from './components/PrintPreview';
import TablePrintPreview from './components/TablePrintPreview';
import SmartImport from './components/SmartImport';
import UpdateSettings from './components/UpdateSettings';
import StorageSettings from './components/StorageSettings';
import DashboardSettings from './components/DashboardSettings';

const initialFilters={search:'',city:'',district:'',propertyType:'',heldBy:'',owner:'',browseKey:'',browseValue:'',page:1,pageSize:12};
export default function App(){
 const [filters,setFilters]=useState(initialFilters),[result,setResult]=useState({items:[],total:0,page:1,pageSize:12,pages:1}),[options,setOptions]=useState({cities:[],districts:[],propertyTypes:[],heldBy:[],owners:[]});
 const [selected,setSelected]=useState(null),[formOpen,setFormOpen]=useState(false),[editing,setEditing]=useState(null),[deleteOpen,setDeleteOpen]=useState(false),[toast,setToast]=useState(''),[loading,setLoading]=useState(true);
 const [viewer,setViewer]=useState(null),[attachmentToDelete,setAttachmentToDelete]=useState(null),[printPreview,setPrintPreview]=useState(false),[importOpen,setImportOpen]=useState(false),[updatesOpen,setUpdatesOpen]=useState(false),[storageOpen,setStorageOpen]=useState(false),[updateStatus,setUpdateStatus]=useState(null),[now,setNow]=useState(()=>new Date()),[tableReport,setTableReport]=useState(null),[dashboardOpen,setDashboardOpen]=useState(false),[reportSettings,setReportSettings]=useState({deedsOwnerName:''});
 useEffect(()=>{const t=setInterval(()=>setNow(new Date()),15000);return()=>clearInterval(t)},[]);
 const today=useMemo(()=>({day:new Intl.DateTimeFormat('ar-SA',{weekday:'long'}).format(now),date:new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit'}).format(now),time:new Intl.DateTimeFormat('ar-SA-u-nu-latn',{hour:'2-digit',minute:'2-digit',hour12:true}).format(now)}),[now]);
 const load=useCallback(async()=>{setLoading(true);try{const data=await api.listDeeds(filters);setResult(data);if(selected&&!data.items.some(x=>x.id===selected.id))setSelected(null)}finally{setLoading(false)}},[filters,selected?.id]);
 const loadOptions=useCallback(async()=>setOptions(await api.getFilters()),[]);
 useEffect(()=>{load()},[filters]);useEffect(()=>{loadOptions()},[]);useEffect(()=>{api.getReportSettings().then(s=>setReportSettings(s||{deedsOwnerName:''})).catch(()=>{})},[]);useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3200);return()=>clearTimeout(t)},[toast]);
 useEffect(()=>api.onUpdateStatus?.(s=>{setUpdateStatus(s);if(s?.hasUpdate)setToast(`يتوفر تحديث جديد V${s.latestVersion}`)}),[]);
 useEffect(()=>{let live=true;(async()=>{try{const cfg=await api.getUpdateSettings();if(cfg?.autoCheck&&cfg.owner&&cfg.repo){const s=await api.checkUpdates(cfg);if(live){setUpdateStatus(s);if(s?.hasUpdate)setToast(`يتوفر تحديث جديد V${s.latestVersion}`)}}}catch{}})();return()=>{live=false}},[]);
 async function selectDeed(id){setSelected(await api.getDeed(id))} function changeFilter(k,v){setFilters(f=>({...f,[k]:v,browseKey:'',browseValue:'',page:1}))}
 async function saveDeed(form){const saved=await api.saveDeed(form);setSelected(saved);await loadOptions();await load();setToast('تم حفظ بيانات الصك بنجاح')}
 async function saveCurrent(){if(!selected){setToast('اختر صكًا أولاً للحفظ');return}try{const saved=await api.saveDeed(selected);setSelected(saved);await loadOptions();await load();setToast('تم الحفظ بنجاح')}catch{setToast('تعذر حفظ البيانات')}}
 function browseByColumn(key,value,label){if(value===undefined||value===null||String(value).trim()==='')return;setFilters(f=>({...f,browseKey:key,browseValue:String(value),page:1}));const custom=key==='held_by'?`استعراض لدى ${value}`:key==='owner_name'?`استعراض صكوك المالك ${value}`:key==='city'?`استعراض مدينة ${value}`:key==='district'?`استعراض حي ${value}`:`استعراض ${label}: ${value}`;setToast(custom)}
 async function addAttachments(){if(!selected)return;const d=await api.chooseAttachments(selected.id);if(d){setSelected(d);await load();setToast('تمت إضافة المرفقات')}}
 async function saveAttachmentNotes(id,notes){if(!selected)return;await api.updateAttachmentNotes(id,notes);setSelected(await api.getDeed(selected.id));setToast(notes.trim()?'تم حفظ بيانات المرفق':'تم مسح بيانات المرفق')}
 async function deleteAttachment(){if(!selected||!attachmentToDelete)return;await api.deleteAttachment(attachmentToDelete.id);setAttachmentToDelete(null);setSelected(await api.getDeed(selected.id));await load();setToast('تم حذف المرفق')}
 async function deleteDeed(){if(!selected)return;await api.deleteDeed(selected.id);setSelected(null);setDeleteOpen(false);await loadOptions();await load();setToast('تم حذف الصك')}
 async function backup(){const r=await api.backup();if(!r?.canceled)setToast('تم إنشاء النسخة الاحتياطية بنجاح')}
 async function printTable(){try{const r=await api.listDeeds({...filters,page:1,pageSize:5000});setTableReport({title:'تقرير الصكوك والعقارات',subtitle:'جميع السجلات المطابقة لمعايير البحث والفلاتر الحالية',reportOwner:reportSettings.deedsOwnerName||'',items:r.items||[]})}catch{setToast('تعذر تجهيز تقرير الطباعة')}}
 async function printOwner(){if(!selected?.owner_name){setToast('اختر صكًا أولاً لتحديد المالك');return}try{const r=await api.listDeeds({...initialFilters,owner:selected.owner_name,page:1,pageSize:5000});setTableReport({title:'تقرير صكوك المالك',subtitle:`جميع الصكوك المسجلة باسم ${selected.owner_name}`,owner:selected.owner_name,reportOwner:reportSettings.deedsOwnerName||'',items:r.items||[]})}catch{setToast('تعذر تجهيز تقرير المالك')}}
 async function importDone(r){await loadOptions();setFilters(f=>({...f,page:1}));await load();setToast(`تم استيراد ${r.inserted} صك وتخطي ${r.skipped}`)}
 return <div className="app-shell">
  <header className="topbar">
   <div className="brand"><div className="brand-mark"><Archive size={22}/></div><div><h1>إدارة الصكوك والعقارات</h1><p>أرشيف محلي آمن ومنظم</p></div></div>
   <div className="header-center"><div className="today-widget"><div className="today-date"><CalendarDays size={17}/><span><b>{today.day}</b><small>{today.date}</small></span></div><div className="today-time" dir="ltr"><Clock3 size={16}/><b>{today.time}</b></div></div><div className="global-search"><Search size={18}/><input value={filters.search} onChange={e=>changeFilter('search',e.target.value)} placeholder="ابحث برقم الوثيقة، اسم المالك، المدينة أو الحي..."/></div></div>
   <div className="toolbar">
    <button className="btn primary" onClick={()=>{setEditing(null);setFormOpen(true)}}><Plus size={18}/>إضافة صك</button>
    <button className="btn secondary save-btn" onClick={saveCurrent}><Save size={17}/>حفظ</button>
    <button className="btn secondary" disabled={!selected} onClick={()=>{setEditing(selected);setFormOpen(true)}}><Pencil size={17}/>تعديل</button>
    <button className="btn secondary" disabled={!selected} onClick={()=>setPrintPreview(true)}><Eye size={17}/>معاينة الطباعة</button>
    <button className="btn secondary" onClick={printTable}><Printer size={17}/>طباعة الجدول</button>
    <button className="btn secondary owner-print" onClick={printOwner}><Building2 size={17}/>حسب المالك</button>
    <button className="btn secondary" onClick={()=>setImportOpen(true)}><FileSpreadsheet size={17}/>استيراد ذكي</button>
    <button className={`btn secondary update-btn ${updateStatus?.hasUpdate?'has-update':''}`} onClick={()=>setUpdatesOpen(true)}><RefreshCw size={17}/>تحديث{updateStatus?.hasUpdate&&<i/>}</button>
    <button className="btn secondary" onClick={()=>setDashboardOpen(true)}><LayoutDashboard size={17}/>لوحة المعلومات</button>
    <button className="btn secondary" onClick={()=>setStorageOpen(true)}><FolderCog size={17}/>مكان البيانات</button>
    <button className="btn secondary backup-btn" onClick={backup}><DatabaseBackup size={17}/>نسخة احتياطية</button>
   </div>
  </header>
  <main className="workspace">
   <PreviewPanel deed={selected} onAddAttachment={addAttachments} onOpenAttachment={api.openAttachment} onPreviewAttachment={setViewer} onDeleteAttachment={setAttachmentToDelete} onSaveAttachmentNotes={saveAttachmentNotes}/>
   <DeedsTable result={result} selectedId={selected?.id} onSelect={selectDeed} onBrowse={browseByColumn} onPage={p=>setFilters(f=>({...f,page:p}))} pageSize={filters.pageSize} onPageSize={n=>setFilters(f=>({...f,pageSize:n,page:1}))}/>
   <Filters filters={filters} options={options} onChange={changeFilter} onReset={()=>setFilters(initialFilters)}/>
  </main>
  <footer className="statusbar"><div><span className="status-dot"/> قاعدة البيانات المحلية جاهزة</div><div>{loading?'جارٍ تحديث البيانات...':`${result.total} صك في النتائج الحالية`}</div><div>SQLite • تخزين محلي • V0.3.1</div></footer>
  <DeedForm open={formOpen} deed={editing} onClose={()=>setFormOpen(false)} onSave={saveDeed}/>
  <AttachmentViewer attachment={viewer} onClose={()=>setViewer(null)}/><PrintPreview deed={printPreview?selected:null} reportOwner={reportSettings.deedsOwnerName||''} onClose={()=>setPrintPreview(false)}/><TablePrintPreview report={tableReport} onClose={()=>setTableReport(null)}/>
  <DashboardSettings open={dashboardOpen} onClose={()=>setDashboardOpen(false)} onSaved={setReportSettings} onToast={setToast}/><StorageSettings open={storageOpen} onClose={()=>setStorageOpen(false)} onToast={setToast} onChanged={async()=>{setSelected(null);await loadOptions();await load();try{setReportSettings(await api.getReportSettings())}catch{}}}/><SmartImport open={importOpen} onClose={()=>setImportOpen(false)} onDone={importDone} onToast={setToast}/><UpdateSettings open={updatesOpen} onClose={()=>setUpdatesOpen(false)} onToast={setToast} initialStatus={updateStatus}/>
  <Modal open={deleteOpen} title="حذف الصك" onClose={()=>setDeleteOpen(false)} width={460}><div className="confirm-body"><div className="danger-icon"><Trash2/></div><h3>هل تريد حذف هذا الصك؟</h3><p>سيتم حذف بيانات الصك وكل المرفقات المرتبطة به نهائيًا.</p><div className="modal-actions"><button className="btn secondary" onClick={()=>setDeleteOpen(false)}>إلغاء</button><button className="btn danger" onClick={deleteDeed}><Trash2 size={17}/>حذف نهائي</button></div></div></Modal>
  <Modal open={!!attachmentToDelete} title="حذف المرفق" onClose={()=>setAttachmentToDelete(null)} width={460}><div className="confirm-body"><div className="danger-icon"><Trash2/></div><h3>هل تريد حذف هذا المرفق؟</h3><p>سيتم حذف <b>{attachmentToDelete?.original_name||'المرفق'}</b> نهائيًا، ولا يمكن التراجع عن هذه الخطوة.</p><div className="modal-actions"><button className="btn secondary" onClick={()=>setAttachmentToDelete(null)}>إلغاء</button><button className="btn danger" onClick={deleteAttachment}><Trash2 size={17}/>تأكيد الحذف</button></div></div></Modal>
  {selected&&<button className="floating-delete" title="حذف الصك المحدد" onClick={()=>setDeleteOpen(true)}><Trash2 size={17}/></button>}{toast&&<div className="toast">{toast}</div>}
 </div>
}
