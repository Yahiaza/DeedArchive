import React,{useEffect,useState} from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';
export default function AttachmentViewer({attachment,onClose}){
 const [data,setData]=useState('');
 useEffect(()=>{let live=true;setData('');if(attachment)api.getAttachmentData(attachment.id).then(x=>live&&setData(x));return()=>{live=false}},[attachment?.id]);
 return <Modal open={!!attachment} title={attachment?.original_name||'معاينة المرفق'} onClose={onClose} width={1080}>
   <div className="viewer-body">
    {!data?<div className="viewer-loading"><Loader2 className="spin"/><span>جارٍ تحميل المرفق...</span></div>:attachment?.mime_group==='image'?<img className="viewer-image" src={data} alt={attachment.original_name}/>:attachment?.mime_group==='pdf'?<iframe className="viewer-pdf" src={data} title={attachment.original_name}/>:<div className="viewer-loading"><FileText size={42}/><span>هذا النوع لا يدعم المعاينة الداخلية.</span></div>}
    <div className="viewer-actions"><button className="btn secondary" onClick={()=>api.openAttachment(attachment.id)}><ExternalLink size={17}/>فتح بالبرنامج الافتراضي</button></div>
   </div>
 </Modal>
}
