import React,{useEffect,useState} from 'react';
import { Eye, FileImage, ImagePlus, Trash2, FileText, Building2, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';
export default function PreviewPanel({deed,onAddAttachment,onOpenAttachment,onPreviewAttachment,onDeleteAttachment}){
 const [previews,setPreviews]=useState({});
 useEffect(()=>{let alive=true;async function load(){if(!deed?.attachments?.length){setPreviews({});return}const pairs=await Promise.all(deed.attachments.slice(0,6).filter(a=>a.mime_group==='image').map(async a=>[a.id,await api.getAttachmentPreview(a.id)]));if(alive)setPreviews(Object.fromEntries(pairs))}load();return()=>{alive=false}},[deed?.id,deed?.attachments?.length]);
 if(!deed)return <section className="panel preview-panel empty-preview"><Building2 size={38}/><h3>اختر صكًا للمعاينة</h3><p>اضغط على أي صف في الجدول لعرض بيانات الصك ومرفقاته هنا.</p></section>;
 const info=[['رقم الوثيقة',deed.document_number],['تاريخ الوثيقة',deed.document_date],['اسم المالك',deed.owner_name],['نوع العقار',deed.property_type],['المساحة',deed.property_area],['رقم القطعة',deed.plot_number],['رقم المخطط',deed.plan_number],['الحي',deed.district],['المدينة',deed.city],['الصك لدى',deed.held_by]];
 const firstImage=deed.attachments?.find(a=>previews[a.id]);
 return <section className="panel preview-panel"><div className="panel-title"><div><FileText size={20}/><h3>معاينة الصك</h3></div><span className="badge">{deed.attachments?.length||0} مرفق</span></div>
  <div className="document-hero">{firstImage?<img className="hero-image clickable" onClick={()=>onPreviewAttachment(firstImage)} src={previews[firstImage.id]} alt="معاينة الصك"/>:<div className="paper"><FileText size={38}/><b>{deed.document_number}</b><span>{deed.owner_name}</span></div>}</div>
  <div className="attachments-row">{(deed.attachments||[]).slice(0,6).map(a=><div key={a.id} className="attachment-thumb" title={a.original_name}>{previews[a.id]?<img src={previews[a.id]} alt=""/>:a.mime_group==='image'?<FileImage size={24}/>:<FileText size={24}/>}<span>{a.original_name}</span><div className="thumb-actions"><button title="معاينة" onClick={()=>onPreviewAttachment(a)}><Eye size={12}/></button><button title="فتح" onClick={()=>onOpenAttachment(a.id)}><ExternalLink size={12}/></button><button className="del" title="حذف" onClick={()=>onDeleteAttachment(a.id)}><Trash2 size={12}/></button></div></div>)}{!deed.attachments?.length&&<div className="no-attachments">لا توجد مرفقات بعد</div>}</div>
  <button className="btn primary full-btn" onClick={onAddAttachment}><ImagePlus size={17}/>إضافة صور / PDF</button>
  <div className="info-list">{info.map(([k,v])=><div className="info-row" key={k}><span>{k}</span><b title={v||''}>{v||'—'}</b></div>)}</div>{deed.notes&&<div className="notes-box"><span>ملاحظات</span><p>{deed.notes}</p></div>}
 </section>
}
