export function uniqueValues(values=[]){
  return [...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
}

export function valuesIncludingCurrent(values=[],currentValue=''){
  return uniqueValues([...values,currentValue]);
}
