import { useEffect, useState } from "react";
import { Plus, Truck } from "lucide-react";
import { suppliersApi } from "../../api/services";
import type { Proveedor } from "../../api/types";
import { Badge, Empty } from "../../components/UI";
import { PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function ProveedoresPage({ openForm, refreshTrigger }: WorkspacePageProps) {
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); suppliersApi.getProveedores().catch(() => []).then((data) => { setSuppliers(data); setLoading(false); }); }, [refreshTrigger]);
  const query = search.toLowerCase();
  return <><PageHeader title="Proveedores" description="Convenios comerciales, plazos de entrega y costos preferidos." actions={<button className="primary" onClick={() => openForm("supplier")}><Plus size={18} /> Nuevo Proveedor</button>} /><SearchToolbar value={search} onChange={setSearch} /><div className="cards-grid">{suppliers.filter((item) => `${item.nombre} ${item.ruc}`.toLowerCase().includes(query)).map((item) => <article className="panel supplier-card" key={item.id}><div className="supplier-top"><span className="card-icon"><Truck size={24} /></span><Badge tone={item.activo ? "green" : "gray"}>{item.activo ? "Activo" : "Inactivo"}</Badge></div><h2>{item.nombre}</h2><p>RUC: {item.ruc}</p><div className="supplier-contact">{item.correo && <a href={`mailto:${item.correo}`}>{item.correo}</a>}{item.telefono && <a href={`tel:${item.telefono}`}>{item.telefono}</a>}</div><div className="card-detail">Tiempo de Entrega (Lead Time) <strong>{item.leadTimeDias} días</strong></div><div className="card-detail">Razón Social <strong>{item.razonSocial || item.nombre}</strong></div></article>)}{!suppliers.length && !loading && <Empty text="No hay proveedores registrados" />}</div></>;
}
