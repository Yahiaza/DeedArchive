import React from 'react';
import { Archive, FileText, Paperclip, Printer } from 'lucide-react';
import Modal from './Modal';

const fields=[
 ['رقم الوثيقة','document_number'],['تاريخ الوثيقة','document_date'],['اسم المالك','owner_name'],['نوع العقار','property_type'],
 ['مساحة العقار','property_area'],['رقم القطعة','plot_number'],['رقم المخطط','plan_number'],['الحي','district'],['المدينة','city'],['الصك لدى','held_by']
];
const latinArabic=(date,withTime=false)=>new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory',withTime?{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}:{year:'numeric',month:'2-digit',day:'2-digit'}).format(date);

export default function PrintPreview({deed,onClose}){
 function doPrint(){document.body.classList.add('printing-deed');setTimeout(()=>{window.print();setTimeout(()=>document.body.classList.remove('printing-deed'),250)},60)}
 const attachments=deed?.attachments||[];
 return <Modal open={!!deed} title="معاينة تقرير الصك" onClose={onClose} width={940}>
  <div className="print-preview-modal">
   <article className="deed-report-sheet" dir="rtl">
    <header className="report-header">
     <div className="report-brand"><span className="report-brand-icon"><Archive size={24}/></span><div><strong>إدارة الصكوك والعقارات</strong><small>نظام الأرشفة المحلية</small></div></div>
     <div className="report-title"><h1>بيانات الصك</h1><p>تقرير تفصيلي لبيانات الوثيقة العقارية</p></div>
     <div className="report-number"><span>رقم السجل</span><b>#{deed?.id||'—'}</b></div>
    </header>
    <section className="report-identity">
      <div><span>رقم الوثيقة</span><strong>{deed?.document_number||'—'}</strong></div>
      <div><span>اسم المالك</span><strong>{deed?.owner_name||'—'}</strong></div>
      <div><span>حالة الحيازة</span><strong>{deed?.held_by||'—'}</strong></div>
    </section>
    <section className="report-section">
      <div className="report-section-title"><FileText size={17}/><h2>تفاصيل العقار والوثيقة</h2></div>
      <div className="report-grid">{fields.map(([label,key])=><div className="report-field" key={key}><span>{label}</span><b>{deed?.[key]||'—'}</b></div>)}</div>
    </section>
    <section className="report-section report-notes-section">
      <div className="report-section-title"><FileText size={17}/><h2>ملاحظات</h2></div>
      <p>{deed?.notes||'لا توجد ملاحظات مسجلة على هذا الصك.'}</p>
    </section>
    <section className="report-section attachments-report">
      <div className="report-section-title"><Paperclip size={17}/><h2>المرفقات</h2><em>{attachments.length} مرفق</em></div>
      {attachments.length?<table><thead><tr><th>م</th><th>اسم الملف</th><th>النوع</th><th>تاريخ الإضافة</th></tr></thead><tbody>{attachments.map((a,i)=><tr key={a.id}><td>{i+1}</td><td>{a.original_name||'مرفق'}</td><td>{a.mime_group==='image'?'صورة':a.mime_group==='pdf'?'PDF':'ملف'}</td><td>{a.created_at?latinArabic(new Date(a.created_at)):'—'}</td></tr>)}</tbody></table>:<div className="report-empty">لا توجد مرفقات مرتبطة بهذا الصك.</div>}
    </section>
    <footer className="report-footer"><div><span>تاريخ الطباعة</span><b>{latinArabic(new Date(),true)}</b></div><p>تم إنشاء هذا التقرير بواسطة نظام إدارة الصكوك والعقارات</p><div><span>عدد المرفقات</span><b>{attachments.length}</b></div></footer>
   </article>
   <div className="modal-actions no-print"><button className="btn primary" onClick={doPrint}><Printer size={17}/>طباعة / حفظ PDF</button><button className="btn secondary" onClick={onClose}>إغلاق</button></div>
  </div>
 </Modal>
}
