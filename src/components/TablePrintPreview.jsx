import React from 'react';
import { Archive, Printer } from 'lucide-react';
import Modal from './Modal';

const cols=[['document_number','رقم الوثيقة',26],['document_date','التاريخ',22],['owner_name','اسم المالك',42],['property_type','نوع العقار',24],['property_area','المساحة',20],['plot_number','القطعة',18],['plan_number','المخطط',20],['district','الحي',28],['city','المدينة',24],['held_by','الصك لدى',34]];
const nowText=()=>new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}).format(new Date());

export default function TablePrintPreview({report,onClose}){
 if(!report)return null;
 function doPrint(){document.body.classList.add('printing-table-report');setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('printing-table-report'),250)},60)}
 return <Modal open title="معاينة تقرير الصكوك" onClose={onClose} width={1180}>
  <div className="table-report-preview">
   <article className="table-report-sheet" dir="rtl">
    <header className="table-report-header">
     <div className="table-report-brand"><span><Archive size={23}/></span><div><b>إدارة الصكوك والعقارات</b><small>تقرير الأرشيف العقاري</small></div></div>
     <div className="table-report-title"><h1>{report.title||'تقرير الصكوك والعقارات'}</h1><p>{report.subtitle||'جميع السجلات المطابقة لمعايير البحث الحالية'}</p></div>
     <div className="table-report-count"><span>إجمالي السجلات</span><b>{report.items.length}</b></div>
    </header>
    <div className="table-report-meta"><span>تاريخ الطباعة: <b>{nowText()}</b></span>{report.owner&&<span>المالك: <b>{report.owner}</b></span>}<span>عدد النتائج: <b>{report.items.length}</b></span></div>
    <table className="print-data-table"><colgroup><col style={{width:'7mm'}}/>{cols.map(([k,,w])=><col key={k} style={{width:`${w}mm`}}/>)}</colgroup><thead><tr><th className="num">م</th>{cols.map(([k,l])=><th key={k}>{l}</th>)}</tr></thead><tbody>{report.items.map((r,i)=><tr key={r.id||i}><td className="num">{i+1}</td>{cols.map(([k])=><td key={k}>{r[k]||'—'}</td>)}</tr>)}</tbody></table>
    {!report.items.length&&<div className="table-report-empty">لا توجد بيانات مطابقة للطباعة.</div>}
    <footer className="table-report-footer"><span>إدارة الصكوك والعقارات</span><span>تقرير تم إنشاؤه إلكترونيًا</span></footer>
   </article>
   <div className="modal-actions no-print"><button className="btn primary" onClick={doPrint}><Printer size={17}/>طباعة / حفظ PDF</button><button className="btn secondary" onClick={onClose}>إغلاق</button></div>
  </div>
 </Modal>
}
