import React,{useEffect,useState} from 'react';
import { Database, FolderOpen, HardDrive, MoveRight } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';

export default function StorageSettings({open,onClose,onToast,onChanged}){
 const [info,setInfo]=useState(null),[busy,setBusy]=useState(false);
 async function refresh(){setInfo(await api.getStorageInfo())}
 useEffect(()=>{if(open)refresh()},[open]);
 async function choose(){
  setBusy(true);
  try{
   const r=await api.chooseStorageLocation();
   if(!r?.canceled){setInfo(r);onToast?.(r.usedExisting?'تم استخدام قاعدة البيانات الموجودة في المكان الجديد':'تم نقل قاعدة البيانات والمرفقات إلى المكان الجديد');await onChanged?.()}
  }catch(e){onToast?.(`تعذر تغيير مكان البيانات: ${e.message}`)}finally{setBusy(false)}
 }
 return <Modal open={open} title="مكان قاعدة البيانات" onClose={onClose} width={760}>
  <div className="storage-settings">
   <div className="storage-hero"><div className="storage-icon"><Database size={25}/></div><div><h3>مكان حفظ بيانات الصكوك</h3><p>اختر قرصًا غير قرص Windows إذا أردت بقاء البيانات عند تهيئة النظام.</p></div></div>
   <div className="storage-path-card"><span>المجلد الحالي</span><strong dir="ltr">{info?.storageRoot||'جارٍ التحميل...'}</strong><small>{info?.isDefault?'المكان الافتراضي داخل AppData — سيتأثر بفرمتة قرص Windows.':'مكان مخصص — مناسب إذا كان على قرص آخر مثل D: أو قرص خارجي.'}</small></div>
   <div className="storage-details"><div><HardDrive size={17}/><span>قاعدة البيانات</span><b dir="ltr">{info?.dbPath||'—'}</b></div><div><FolderOpen size={17}/><span>المرفقات</span><b dir="ltr">{info?.attachmentsDir||'—'}</b></div></div>
   <div className="storage-note">عند اختيار مكان جديد سيُنشئ البرنامج مجلد <b>DeedArchiveData</b> وينسخ إليه قاعدة البيانات الحالية وكل المرفقات. لو وجد قاعدة بيانات موجودة سيطلب منك الاختيار قبل أي استبدال.</div>
   <div className="settings-actions"><button className="btn primary" disabled={busy} onClick={choose}><MoveRight size={17}/>{busy?'جارٍ النقل...':'تغيير مكان البيانات'}</button><button className="btn secondary" disabled={!info?.storageRoot} onClick={()=>api.openStorageFolder()}><FolderOpen size={17}/>فتح المجلد الحالي</button></div>
  </div>
 </Modal>
}
