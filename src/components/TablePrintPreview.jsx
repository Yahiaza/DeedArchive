import React from 'react';
import { Archive, Printer, FileDown, X } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';

const cols=[['document_number','رقم الوثيقة',28],['document_date','التاريخ',22],['owner_name','اسم المالك',44],['property_type','نوع العقار',25],['property_area','المساحة',20],['plot_number','القطعة',18],['plan_number','المخطط',20],['district','الحي',29],['city','المدينة',24],['held_by','الصك لدى',35]];
const nowText=()=>new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date());

async function runLandscapePrint(action){
 document.body.classList.add('printing-table-report');
 await new Promise(r=>setTimeout(r,120));
 try{return await action()}finally{document.body.classList.remove('printing-table-report')}
}

async function printLandscape(){
 return runLandscapePrint(()=>api.printLandscape());
}

async function saveLandscapePdf(report){
 const suffix=report?.owner?`-${report.owner}`:'';
 const name=`DeedArchive-${report?.title||'report'}${suffix}.pdf`;
 return runLandscapePrint(()=>api.saveLandscapePdf(name));
}

export default function TablePrintPreview({report,onClose}){
 if(!report)return null;
 return <Modal open title="معاينة تقرير الصكوك" onClose={onClose} width={1260}>
  <div className="table-report-preview">
   <div className="print-floating-actions no-print">
    <button className="floating-print-btn" onClick={printLandscape}><Printer size={18}/>طباعة A4 أفقي</button>
    <button className="floating-pdf-btn" onClick={()=>saveLandscapePdf(report)}><FileDown size={18}/>حفظ PDF أفقي</button>
    <button className="floating-close-btn" onClick={onClose} title="إغلاق (Esc)"><X size={18}/></button>
   </div>
   <article className="table-report-sheet" dir="rtl">
    <header className="table-report-header">
     <div className="table-report-brand"><span><Archive size={23}/></span><div><b>إدارة الصكوك والعقارات</b><small>تقرير الأرشيف العقاري</small></div></div>
     <div className="table-report-title"><div className="table-title-line"><h1>{report.title||'تقرير الصكوك والعقارات'}</h1>{report.reportOwner&&<div className="report-owner-badge"><span> </span><b>{report.reportOwner}</b></div>}</div><p>{report.subtitle||'جميع السجلات المطابقة لمعايير البحث الحالية'}</p></div>
     <div className="table-report-count"><span>إجمالي السجلات</span><b>{report.items.length}</b></div>
    </header>
    <div className="table-report-meta"><span>تاريخ الطباعة: <b>{nowText()}</b></span>{report.owner&&<span>المالك: <b>{report.owner}</b></span>}<span>عدد النتائج: <b>{report.items.length}</b></span></div>
    <div className="print-table-frame">
     <table className="print-data-table"><colgroup><col style={{width:'7mm'}}/>{cols.map(([k,,w])=><col key={k} style={{width:`${w}mm`}}/>)}</colgroup><thead><tr><th className="num">م</th>{cols.map(([k,l])=><th key={k}>{l}</th>)}</tr></thead><tbody>{report.items.map((r,i)=><tr key={r.id||i}><td className="num">{i+1}</td>{cols.map(([k])=><td key={k} className={k==='document_number'?'doc-number-cell':''} title={r[k]||''}>{r[k]||'—'}</td>)}</tr>)}</tbody></table>
    </div>
    {!report.items.length&&<div className="table-report-empty">لا توجد بيانات مطابقة للطباعة.</div>}
    <footer className="table-report-footer"><span>إدارة الصكوك والعقارات</span><span>تقرير تم إنشاؤه إلكترونيًا</span></footer>
   </article>
  </div>
 </Modal>
}
