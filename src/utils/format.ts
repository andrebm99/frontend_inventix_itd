export const money = (n: number) => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
export const date = (s?: string | null) => {
  if (!s) return 'Sin fecha';
  const value = new Date(s.length === 10 ? `${s}T12:00:00` : s);
  if (Number.isNaN(value.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(value);
};
export const daysLeft = (s: string) => Math.ceil((new Date(s+'T23:59:59').getTime()-Date.now())/86400000);
export function downloadCSV(name: string, rows: (string|number)[][]) { const content='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'); const a=document.createElement('a'); const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})); a.href=url; a.download=name+'.csv'; a.click(); URL.revokeObjectURL(url); }
