import React,{useEffect,useState} from 'react';
import { CheckCircle2, Download, RefreshCw, Save } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';
export default function UpdateSettings({open,onClose,onToast,initialStatus}){
 const [form,setForm]=useState({owner:'',repo:'',autoCheck:true,currentVersion:''});const [status,setStatus]=useState(initialStatus||null);const [busy,setBusy]=useState(false);
 useEffect(()=>{if(open)api.getUpdateSettings().then(setForm)},[open]);useEffect(()=>{if(initialStatus)setStatus(initialStatus)},[initialStatus]);
 async function save(){const s=await api.saveUpdateSettings(form);setForm(f=>({...f,...s}));onToast?.('تم حفظ إعدادات التحديث')}
 async function check(){setBusy(true);try{const s=await api.checkUpdates(form);setStatus(s)}catch(e){onToast?.(`تعذر فحص التحديث: ${e.message}`)}finally{setBusy(false)}}
 async function download(){setBusy(true);try{await api.downloadUpdate(status);onToast?.('تم تنزيل التحديث إلى مجلد Downloads')}catch(e){onToast?.(e.message)}finally{setBusy(false)}}
 return <Modal open={open} title="التحديثات التلقائية" onClose={onClose} width={780}>
  <div className="settings-body"><div className="version-chip">V{form.currentVersion||'—'}</div>
   <div className="form-grid"><label className="field"><span>حساب GitHub</span><input value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} placeholder="مثال: Yahiaza"/></label><label className="field"><span>اسم Repository</span><input value={form.repo} onChange={e=>setForm(f=>({...f,repo:e.target.value}))} placeholder="مثال: DeedArchive"/></label></div>
   <label className="check-row"><input type="checkbox" checked={!!form.autoCheck} onChange={e=>setForm(f=>({...f,autoCheck:e.target.checked}))}/><span>البحث تلقائيًا عن تحديث عند تشغيل البرنامج</span></label>
   <div className="settings-actions"><button className="btn secondary" onClick={save}><Save size={17}/>حفظ الإعدادات</button><button className="btn primary" onClick={check} disabled={busy}><RefreshCw className={busy?'spin':''} size={17}/>فحص الآن</button></div>
   {status&&<div className={`update-status ${status.hasUpdate?'available':'current'}`}><CheckCircle2 size={22}/><div><b>{status.configured?(status.hasUpdate?`يتوفر إصدار ${status.latestVersion}`:`أنت على أحدث إصدار V${status.currentVersion}`):'أدخل بيانات GitHub أولاً'}</b>{status.releaseName&&<span>{status.releaseName}</span>}</div>{status.hasUpdate&&status.asset&&<button className="btn primary" onClick={download} disabled={busy}><Download size={17}/>تنزيل التحديث</button>}</div>}
  </div>
 </Modal>
}
