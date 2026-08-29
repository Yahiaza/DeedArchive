import React from 'react';
import { Printer } from 'lucide-react';
import Modal from './Modal';
const fields=[['رقم الوثيقة','document_number'],['تاريخ الوثيقة','document_date'],['اسم المالك','owner_name'],['نوع العقار','property_type'],['مساحة العقار','property_area'],['رقم القطعة','plot_number'],['رقم المخطط','plan_number'],['الحي','district'],['المدينة','city'],['الصك لدى','held_by']];
export default function PrintPreview({deed,onClose}){
 function doPrint(){document.body.classList.add('printing-deed');setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('printing-deed'),250)},50)}
 return <Modal open={!!deed} title="معاينة قبل الطباعة" onClose={onClose} width={820}>
  <div className="print-preview-modal">
   <article className="print-preview-sheet">
    <div className="print-logo">إدارة الصكوك والعقارات</div><h1>بيانات الصك</h1>
    <div className="print-grid">{fields.map(([label,key])=><div key={key}><span>{label}</span><b>{deed?.[key]||'—'}</b></div>)}</div>
    {deed?.notes&&<div className="print-notes"><span>ملاحظات</span><p>{deed.notes}</p></div>}
    <div className="print-meta">عدد المرفقات: {deed?.attachments?.length||0}</div>
   </article>
   <div className="modal-actions no-print"><button className="btn primary" onClick={doPrint}><Printer size={17}/>طباعة الصك</button><button className="btn secondary" onClick={onClose}>إغلاق</button></div>
  </div>
 </Modal>
}
