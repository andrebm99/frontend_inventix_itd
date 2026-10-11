import type { Store } from '../types';
export const money = (n: number) => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
export const date = (s: string) => new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeZone:'America/Lima'}).format(new Date(s.length===10?s+'T12:00:00':s));
export const daysLeft = (s: string) => Math.ceil((new Date(s+'T23:59:59').getTime()-Date.now())/86400000);
export const stock = (s: Store,id: string,warehouse?: string) => s.lots.filter(l=>l.productId===id&&(!warehouse||l.warehouse===warehouse)).reduce((a,l)=>a+l.quantity,0);
export const uid = () => crypto.randomUUID();
export function downloadCSV(name: string, rows: (string|number)[][]) { const content='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'); const a=document.createElement('a'); const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'})); a.href=url; a.download=name+'.csv'; a.click(); URL.revokeObjectURL(url); }
