import { useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useStore } from './hooks/useStore';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Workspace } from './pages/Workspace';
import { Login } from './pages/Login';
import { Modal } from './components/UI';
import { RecordForm, type FormKind } from './components/RecordForm';
import type { Page, Product, User } from './types';
import { stock, daysLeft } from './utils/format';
const pages:Page[]=['Resumen','Productos','Movimientos','Almacenes','Lotes y vencimientos','Proveedores','Ventas','Pronósticos','Clasificación ABC','Reabastecimiento','Reportes','Usuarios','Alertas'];
function currentPage():Page {try{const p=decodeURIComponent(location.hash.slice(1));return pages.includes(p as Page)?p as Page:'Resumen';}catch{return 'Resumen';}}
export default function App(){const {store,setStore,storageError}=useStore();const [page,setPage]=useState<Page>(currentPage);const [userId,setUserId]=useState(()=>sessionStorage.getItem('inventix-user')||'u1');const user=store.users.find(u=>u.id===userId&&u.active);const [form,setForm]=useState<{kind:FormKind;edit?:Product}>();const [toast,setToast]=useState('');const [mobile,setMobile]=useState(false);
useEffect(()=>{const handler=()=>setPage(currentPage());window.addEventListener('hashchange',handler);return()=>window.removeEventListener('hashchange',handler)},[]);
useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(t)},[toast]);
useEffect(()=>{if(user&&user.role!=='Administrador'&&page==='Usuarios')navigate('Resumen');},[page,user]);
function navigate(p:Page){location.hash=encodeURIComponent(p);setPage(p);window.scrollTo({top:0});}
function login(u:User){setMobile(false);setUserId(u.id);sessionStorage.setItem('inventix-user',u.id);navigate('Resumen');}
function openForm(kind:FormKind,edit?:Product){if(!user)return;if((kind==='user'&&user.role!=='Administrador')||(user.role==='Cajero'&&kind!=='movement')){setToast('Tu perfil no permite esta acción');return;}setForm({kind,edit});}
if(!user)return <Login users={store.users} onLogin={login}/>;
const alerts=store.products.filter(p=>stock(store,p.id)<=p.min).length+store.lots.filter(l=>l.quantity>0&&daysLeft(l.expiry)<=30).length;
return <><AppLayout page={page} navigate={navigate} alerts={alerts} user={user} logout={()=>{setMobile(false);setUserId('');sessionStorage.setItem('inventix-user','');setForm(undefined)}} mobile={mobile} setMobile={setMobile}>{storageError&&<p className="form-error">El navegador no pudo guardar los cambios. Esta sesión conserva los datos temporalmente.</p>}{page==='Resumen'?<Dashboard store={store} navigate={navigate} onMovement={()=>openForm('movement')} onProduct={()=>openForm('product')}/>:<Workspace key={page} page={page} store={store} setStore={setStore} openForm={openForm} notify={setToast} user={user}/>}</AppLayout>{form&&<Modal title={form.edit?'Editar producto':{product:'Nuevo producto',supplier:'Nuevo proveedor',warehouse:'Nuevo almacén',user:'Nuevo usuario',movement:page==='Ventas'?'Registrar venta':'Registrar movimiento'}[form.kind]} onClose={()=>setForm(undefined)}><RecordForm initialType={page==='Ventas'?'Salida':undefined} kind={form.kind} edit={form.edit} store={store} setStore={setStore} close={()=>setForm(undefined)} notify={setToast} user={user}/></Modal>}{toast&&<div className="toast" role="status"><CheckCircle2 size={20}/>{toast}<button aria-label="Cerrar aviso" onClick={()=>setToast('')}><X size={16}/></button></div>}</>}
