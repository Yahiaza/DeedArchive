import React,{useMemo,useState} from 'react';
import { FileSpreadsheet, Upload, CheckCircle2, ArrowLeftRight, Eye } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';
const fields=[['document_number','رقم الوثيقة'],['document_date','تاريخ الوثيقة'],['owner_name','اسم المالك'],['property_type','نوع العقار'],['property_area','مساحة العقار'],['plot_number','رقم القطعة'],['plan_number','رقم المخطط'],['district','الحي'],['city','المدينة'],['held_by','الصك لدى'],['notes','ملاحظات']];
export default function SmartImport({open,onClose,onDone,onToast}){
 const [file,setFile]=useState(null),[data,setData]=useState(null),[sheetName,setSheetName]=useState(''),[fromCell,setFromCell]=useState('A1'),[toCell,setToCell]=useState('K100');
 const [headerRow,setHeaderRow]=useState(0),[mapping,setMapping]=useState({}),[busy,setBusy]=useState(false),[report,setReport]=useState(null);
 const headers=useMemo(()=>data?.rows?.[headerRow]||[],[data,headerRow]);
 async function choose(){
  try{const r=await api.chooseImport();if(!r?.canceled){setFile(r);setData(null);setSheetName(r.defaultSheet||r.sheetNames?.[0]||'');setFromCell('A1');setToCell('K100');setMapping({});setHeaderRow(0);setReport(null)}}catch(e){onToast?.(e.message)}
 }
 async function previewRange(){
  if(!file)return;setBusy(true);
  try{const r=await api.loadImportRange({sessionId:file.sessionId,sheetName,fromCell,toCell});setData(r);setHeaderRow(Number(r.suggestedHeaderRow||0));setMapping(r.suggestedMapping||{});setReport(null);if((r.matchedHeaders||0)>1)onToast?.(`تم التعرف تلقائياً على ${r.matchedHeaders} أعمدة`)}catch(e){onToast?.(e.message)}finally{setBusy(false)}
 }
 async function commit(){
  if(mapping.document_number===undefined||mapping.owner_name===undefined){onToast?.('حدد عمود رقم الوثيقة واسم المالك أولاً');return}
  setBusy(true);try{const r=await api.commitImport({sessionId:data.sessionId,headerRow,mapping,skipDuplicates:true});setReport(r);await onDone?.(r)}catch(e){onToast?.(e.message)}finally{setBusy(false)}
 }
 return <Modal open={open} title="الاستيراد من Excel" onClose={onClose} width={1180}>
  <div className="import-body">
   {!file?<div className="import-start"><FileSpreadsheet size={54}/><h3>استيراد الصكوك من نطاق محدد</h3><p>اختر الملف أولاً، وبعدها حدد بداية ونهاية الخلايا التي تحتوي على البيانات فقط.</p><button className="btn primary" onClick={choose}><Upload size={17}/>اختيار ملف Excel</button></div>:<>
    <div className="import-filebar"><b>{file.fileName}</b><span>لن يتم تحميل الشيت كاملاً — سيتم قراءة النطاق الذي تحدده فقط</span><button className="btn secondary" onClick={choose}>تغيير الملف</button></div>
    <div className="range-picker">
     <label className="field"><span>ورقة Excel</span><select value={sheetName} onChange={e=>{setSheetName(e.target.value);setData(null)}}>{(file.sheetNames||[]).map(n=><option key={n} value={n}>{n}</option>)}</select></label>
     <label className="field"><span>من الخلية</span><input dir="ltr" value={fromCell} onChange={e=>{setFromCell(e.target.value.toUpperCase());setData(null)}} placeholder="A1"/></label>
     <ArrowLeftRight size={20} className="range-arrow"/>
     <label className="field"><span>إلى الخلية</span><input dir="ltr" value={toCell} onChange={e=>{setToCell(e.target.value.toUpperCase());setData(null)}} placeholder="K85"/></label>
     <button className="btn primary range-preview-btn" onClick={previewRange} disabled={busy}><Eye size={17}/>{busy?'جارٍ القراءة...':'معاينة النطاق'}</button>
    </div>
    <div className="range-help">مثال: لو العناوين في الصف 3 والبيانات تنتهي عند الصف 84، اختر <b>A3</b> إلى <b>K84</b>. البرنامج لن يقرأ الأعمدة أو الصفوف خارج هذا النطاق.</div>
    {data&&<>
     <div className="import-filebar compact"><b>النطاق: {data.rangeFrom}:{data.rangeTo}</b><span>{data.sheetName} • {data.rowCount} صف • {data.columns.length} عمود • من {data.sourceStartColumn} إلى {data.sourceEndColumn}</span></div>
     <div className="import-layout"><div className="mapping-panel"><label className="field"><span>صف العناوين داخل النطاق</span><select value={headerRow} onChange={e=>setHeaderRow(Number(e.target.value))}>{data.rows.slice(0,15).map((_,i)=><option value={i} key={i}>الصف {data.sourceStartRow+i}</option>)}</select></label>{fields.map(([key,label])=><label className="field map-field" key={key}><span>{label}{['document_number','owner_name'].includes(key)?' *':''}</span><select value={mapping[key]??''} onChange={e=>setMapping(m=>({...m,[key]:e.target.value===''?undefined:Number(e.target.value)}))}><option value="">غير محدد</option>{data.columns.map(c=><option value={c.index} key={c.index}>{c.letter} — {headers[c.index]||`عمود ${c.letter}`}</option>)}</select></label>)}</div>
      <div className="excel-preview"><table><thead><tr><th>#</th>{data.columns.map(c=><th key={c.index}>{c.letter}<small>{headers[c.index]||''}</small></th>)}</tr></thead><tbody>{data.rows.slice(Math.max(0,headerRow),Math.min(data.rows.length,headerRow+18)).map((row,ri)=><tr className={ri===0?'header-source':''} key={ri}><td>{data.sourceStartRow+headerRow+ri}</td>{data.columns.map(c=><td key={c.index} title={row[c.index]||''}>{row[c.index]||'—'}</td>)}</tr>)}</tbody></table></div></div>
     {report?<div className="import-report"><CheckCircle2/><b>تم استيراد {report.inserted} سجل</b><span>تم تخطي {report.skipped} سجل (فارغ أو مكرر)</span></div>:<div className="modal-actions"><button className="btn primary" onClick={commit} disabled={busy}><Upload size={17}/>{busy?'جارٍ الاستيراد...':'استيراد البيانات'}</button><button className="btn secondary" onClick={onClose}>إلغاء</button></div>}
    </>}
   </>}
  </div>
 </Modal>
}
