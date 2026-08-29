import React from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';

export default function Filters({ filters, options, onChange, onReset }) {
 const select=(key,label,values)=><label className="filter-field"><span>{label}</span><select value={filters[key]||''} onChange={e=>onChange(key,e.target.value)}><option value="">الكل</option>{values.map(v=><option key={v} value={v}>{v}</option>)}</select></label>;
 return <section className="panel filters-panel"><div className="panel-title"><div><Filter size={20}/><h3>البحث والفلاتر</h3></div><span className="tiny">تصفية فورية</span></div>
   <label className="filter-field search-local"><span>بحث سريع</span><div className="input-icon"><Search size={17}/><input value={filters.search||''} onChange={e=>onChange('search',e.target.value)} placeholder="رقم الوثيقة، المالك، الحي..."/></div></label>
   <div className="filters-stack">{select('city','المدينة',options.cities||[])}{select('district','الحي',options.districts||[])}{select('propertyType','نوع العقار',options.propertyTypes||[])}{select('heldBy','الصك لدى',options.heldBy||[])}{select('owner','اسم المالك',options.owners||[])}</div>
   <button className="btn ghost full-btn" onClick={onReset}><RotateCcw size={17}/>إعادة تعيين</button>
 </section>;
}
