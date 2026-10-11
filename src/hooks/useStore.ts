import { useEffect, useState } from 'react';
import type { Store } from '../types';
import { seed } from '../data/seed';
export function useStore() {
const [store,setStore] = useState<Store>(()=>{try{const saved=JSON.parse(localStorage.getItem('inventix-v1')||'null'); return saved?.products&&saved?.lots&&saved?.users&&saved?.orders?saved:structuredClone(seed);}catch{return structuredClone(seed);}});
const [storageError,setStorageError]=useState(false);
useEffect(()=>{try{localStorage.setItem('inventix-v1',JSON.stringify(store));setStorageError(false);}catch{setStorageError(true);}},[store]);
return {store,setStore,storageError};
}
