import type { Store, Movement } from '../types';
import { daysLeft, uid } from './format';
export function applyMovement(store: Store, input: Omit<Movement,'id'|'date'>, lotCode: string, expiry: string): Store {
const next=structuredClone(store); const p=next.products.find(p=>p.id===input.productId);if(!p)throw Error('Selecciona un producto válido.');
if(!Number.isInteger(input.quantity)||input.quantity<=0)throw Error('La cantidad debe ser un entero mayor a cero.');
if(!next.warehouses.includes(input.warehouse))throw Error('Selecciona un almacén válido.');
if(input.type==='Transferencia'&&(!input.destination||input.destination===input.warehouse||!next.warehouses.includes(input.destination)))throw Error('Selecciona un destino distinto al origen.');
if(input.type==='Entrada') {
if(!lotCode.trim()||!expiry)throw Error('Ingresa el lote y su fecha de vencimiento.');
if(daysLeft(expiry)<0)throw Error('No se puede recibir un lote vencido.');
let lot=next.lots.find(l=>l.productId===p.id&&l.code===lotCode.trim()&&l.warehouse===input.warehouse);
if(lot&&lot.expiry!==expiry)throw Error('Ese lote ya tiene otra fecha de vencimiento.');
if(lot)lot.quantity+=input.quantity;else next.lots.push({id:uid(),productId:p.id,code:lotCode.trim(),expiry,warehouse:input.warehouse,quantity:input.quantity});
} else {
const lots=next.lots.filter(l=>l.productId===p.id&&l.warehouse===input.warehouse&&(input.type==='Merma'||input.type==='Transferencia'||daysLeft(l.expiry)>=0)).sort((a,b)=>a.expiry.localeCompare(b.expiry));
if(lots.reduce((a,l)=>a+l.quantity,0)<input.quantity)throw Error('Stock insuficiente en el almacén. Las ventas excluyen lotes vencidos.');
let remaining=input.quantity;
for(const lot of lots){const q=Math.min(remaining,lot.quantity);lot.quantity-=q;remaining-=q;if(input.type==='Transferencia'&&q>0){const target=next.lots.find(l=>l.productId===p.id&&l.code===lot.code&&l.warehouse===input.destination);if(target)target.quantity+=q;else next.lots.push({...lot,id:uid(),warehouse:input.destination!,quantity:q});}if(!remaining)break;}
}
next.movements.unshift({...input,id:uid(),date:new Date().toISOString()});return next;
}
