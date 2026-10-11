import type { Store } from '../types';
const today = new Date();
const expiry = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return d.toISOString().slice(0,10); };
export const seed: Store = {
products: [
{id:'p1',sku:'AB-001',name:'Arroz extra Costeño 1 kg',category:'Abarrotes',unit:'Bolsa',price:5.9,cost:4.2,min:40,supplier:'s1'},
{id:'p2',sku:'LA-002',name:'Leche evaporada Gloria 400 g',category:'Lácteos',unit:'Lata',price:4.8,cost:3.6,min:30,supplier:'s2'},
{id:'p3',sku:'BE-003',name:'Agua San Luis 625 ml',category:'Bebidas',unit:'Botella',price:2.5,cost:1.3,min:24,supplier:'s3'},
{id:'p4',sku:'AB-004',name:'Aceite Primor 900 ml',category:'Abarrotes',unit:'Botella',price:9.9,cost:7.2,min:20,supplier:'s1'},
{id:'p5',sku:'LA-005',name:'Yogurt Gloria fresa 1 kg',category:'Lácteos',unit:'Botella',price:8.5,cost:6.1,min:15,supplier:'s2'},
{id:'p6',sku:'LI-006',name:'Detergente Bolívar 800 g',category:'Limpieza',unit:'Bolsa',price:10.5,cost:7.8,min:12,supplier:'s1'},
{id:'p7',sku:'SN-007',name:'Galletas Oreo sixpack',category:'Snacks',unit:'Paquete',price:6.9,cost:4.5,min:18,supplier:'s3'},
{id:'p8',sku:'AB-008',name:'Azúcar rubia Cartavio 1 kg',category:'Abarrotes',unit:'Bolsa',price:4.5,cost:3.2,min:25,supplier:'s1'}],
lots:[
{id:'l1',productId:'p1',code:'COS-2601',expiry:expiry(160),warehouse:'Tienda principal',quantity:128},
{id:'l2',productId:'p1',code:'COS-2602',expiry:expiry(220),warehouse:'Almacén central',quantity:200},
{id:'l3',productId:'p2',code:'GLO-1048',expiry:expiry(18),warehouse:'Tienda principal',quantity:24},
{id:'l4',productId:'p3',code:'SL-0882',expiry:expiry(190),warehouse:'Tienda principal',quantity:96},
{id:'l5',productId:'p4',code:'PRI-0420',expiry:expiry(280),warehouse:'Tienda principal',quantity:12},
{id:'l6',productId:'p5',code:'YG-1022',expiry:expiry(5),warehouse:'Tienda principal',quantity:18},
{id:'l7',productId:'p6',code:'BOL-0824',expiry:expiry(400),warehouse:'Almacén central',quantity:45},
{id:'l8',productId:'p7',code:'OR-0711',expiry:expiry(90),warehouse:'Tienda principal',quantity:0},
{id:'l9',productId:'p8',code:'CAR-2201',expiry:expiry(300),warehouse:'Almacén central',quantity:84},
{id:'l10',productId:'p5',code:'YG-1010',expiry:expiry(-2),warehouse:'Almacén central',quantity:4}],
suppliers:[{id:'s1',name:'Alicorp S.A.A.',ruc:'20100055237',email:'pedidos@alicorp.com.pe',phone:'987 654 321',lead:3,active:true},{id:'s2',name:'Gloria S.A.',ruc:'20100190797',email:'ventas@gloria.com.pe',phone:'984 221 456',lead:2,active:true},{id:'s3',name:'Distribuidora San Jorge',ruc:'20601234567',email:'pedidos@sanjorgedemo.pe',phone:'991 320 678',lead:5,active:true}],
warehouses:['Tienda principal','Almacén central'],
users:[{id:'u1',name:'Andrea Mendoza',email:'andrea@inventix.demo',role:'Administrador',active:true},{id:'u2',name:'Carlos Ramos',email:'carlos@inventix.demo',role:'Almacenero',active:true},{id:'u3',name:'Lucía Torres',email:'lucia@inventix.demo',role:'Cajero',active:true}],
movements:Array.from({length:28},(_,i)=>({id:'m'+i,productId:'p'+(i%8+1),type:i%3===0?'Entrada':'Salida',quantity:5+i%14,warehouse:i%2?'Tienda principal':'Almacén central',date:new Date(today.getTime()-i*86400000).toISOString(),reason:i%3===0?'Recepción de proveedor':'Venta en tienda',user:'Andrea Mendoza'})), orders:[]};
