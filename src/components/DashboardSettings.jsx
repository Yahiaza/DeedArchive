import React,{useEffect,useState} from 'react';
import { LayoutDashboard, Save, UserRound } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';

export default function DashboardSettings({open,onClose,onSaved,onToast}){
 const [name,setName]=useState(''),[loading,setLoading]=useState(false);
 useEffect(()=>{if(!open)return;(async()=>{try{const s=await api.getReportSettings();setName(s?.deedsOwnerName||'')}catch{setName('')}})()},[open]);
 async function save(){
  setLoading(true);
  try{const saved=await api.saveReportSettings({deedsOwnerName:name});onSaved?.(saved);onToast?.('تم حفظ بيانات لوحة المعلومات بنجاح');onClose?.()}catch{onToast?.('تعذر حفظ بيانات لوحة المعلومات')}finally{setLoading(false)}
 }
 return <Modal open={open} title="لوحة المعلومات" onClose={onClose} width={560}>
  <div className="dashboard-settings-body">
   <div className="dashboard-settings-intro"><span><LayoutDashboard size={22}/></span><div><b>بيانات التقارير</b><small>تظهر هذه البيانات تلقائيًا في المعاينة والطباعة وملفات PDF.</small></div></div>
   <label className="field dashboard-owner-field"><span><UserRound size={15}/> اسم صاحب الصكوك</span><input value={name} onChange={e=>setName(e.target.value)} placeholder="اكتب اسم صاحب الصكوك..." autoFocus/></label>
   <div className="modal-actions"><button className="btn secondary" onClick={onClose}>إلغاء</button><button className="btn primary" onClick={save} disabled={loading}><Save size={17}/>{loading?'جارٍ الحفظ...':'حفظ'}</button></div>
  </div>
 </Modal>
}
