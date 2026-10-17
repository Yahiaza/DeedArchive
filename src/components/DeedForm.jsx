import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { ChevronDown, Save, X } from 'lucide-react';
import { valuesIncludingCurrent } from '../lib/valueOptions';

const empty = { document_number:'', document_date:'', owner_name:'', property_type:'', property_area:'', plot_number:'', plan_number:'', district:'', city:'', held_by:'', notes:'' };
const fields = [
  ['document_number','رقم الوثيقة','مثال: 1234567890'], ['document_date','تاريخ الوثيقة','1445/07/18'],
  ['owner_name','اسم المالك','اسم المالك'], ['property_type','نوع العقار','أرض سكنية / فيلا ...'],
  ['property_area','مساحة العقار','مثال: 750 م²'], ['plot_number','رقم القطعة','رقم القطعة'],
  ['plan_number','رقم المخطط','رقم المخطط'], ['district','الحي','اسم الحي'],
  ['city','المدينة','اسم المدينة'], ['held_by','الصك لدى','المالك / بنك / جهة أخرى']
];
const ADD_NEW_VALUE='__add_new_value__';

function ValuePicker({value,values,onChange,placeholder}){
  const [adding,setAdding]=useState(false);
  const options=valuesIncludingCurrent(values,value);
  useEffect(()=>{if(value&&values.includes(value))setAdding(false)},[value,values]);
  if(adding)return <div className="value-picker value-picker-custom"><input autoFocus value={value||''} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/><button type="button" title="العودة إلى القائمة" onClick={()=>setAdding(false)}><ChevronDown size={17}/></button></div>;
  return <div className="value-picker"><select value={value||''} onChange={event=>{if(event.target.value===ADD_NEW_VALUE){setAdding(true);onChange('')}else onChange(event.target.value)}}><option value="">اختر أو أضف قيمة</option>{options.map(option=><option key={option} value={option}>{option}</option>)}<option value={ADD_NEW_VALUE}>＋ إضافة قيمة جديدة</option></select></div>;
}

export default function DeedForm({ open, deed, options={}, onClose, onSave }) {
  const [form,setForm] = useState(empty); const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  useEffect(()=>{ setForm(deed ? { ...empty, ...deed } : empty); setError(''); },[deed,open]);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function submit(e){e.preventDefault(); setBusy(true); setError(''); try{await onSave(form); onClose();}catch(err){setError(err.message||'تعذر الحفظ');}finally{setBusy(false)}}
  return <Modal open={open} title={deed?.id?'تعديل بيانات الصك':'إضافة صك جديد'} onClose={onClose} width={820}>
    <form onSubmit={submit} className="form-body">
      <div className="form-grid">{fields.map(([k,l,p])=><label className="field" key={k}><span>{l}{['document_number','owner_name'].includes(k)&&<b>*</b>}</span><ValuePicker value={form[k]||''} values={options[k]||[]} onChange={value=>update(k,value)} placeholder={p}/></label>)}</div>
      <label className="field full"><span>ملاحظات</span><textarea rows="3" value={form.notes||''} onChange={e=>update('notes',e.target.value)} placeholder="أي ملاحظات إضافية عن الصك أو العقار..."/></label>
      {error&&<div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}><X size={17}/>إلغاء</button><button className="btn primary" disabled={busy}><Save size={17}/>{busy?'جارٍ الحفظ...':'حفظ الصك'}</button></div>
    </form>
  </Modal>;
}
