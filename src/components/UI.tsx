import { useEffect, useRef, type ReactNode } from 'react';
import { X, PackageOpen } from 'lucide-react';
export function Badge({children,tone='green'}:{children:ReactNode;tone?:'green'|'red'|'amber'|'gray'}) {return <span className={'badge '+tone}>{children}</span>}
export function Empty({text='No se encontraron resultados'}:{text?:string}) {return <div className="empty"><PackageOpen size={36}/><h3>{text}</h3><p>Prueba con otros filtros o registra un nuevo elemento.</p></div>}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal();},[]);return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}} className="modal"><div className="modal-title"><h2>{title}</h2><button aria-label="Cerrar" onClick={onClose}><X size={20}/></button></div>{children}</dialog>}
export function Field({label,children}:{label:string;children:ReactNode}) {return <label className="field"><span>{label}</span>{children}</label>}
export function Table({headers,children}:{headers:string[];children:ReactNode}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
