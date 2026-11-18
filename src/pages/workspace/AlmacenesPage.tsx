import { useEffect, useState } from "react";
import { ArrowUpRight, Plus, Warehouse } from "lucide-react";
import { organizationApi } from "../../api/services";
import type { Almacen } from "../../api/types";
import { Badge, Empty } from "../../components/UI";
import { PageHeader, type WorkspacePageProps } from "./shared";

export function AlmacenesPage({ openForm, refreshTrigger }: WorkspacePageProps) {
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); organizationApi.getAlmacenes().catch(() => []).then((data) => { setWarehouses(data); setLoading(false); }); }, [refreshTrigger]);
  return <>
    <PageHeader title="Almacenes" description="Centros de distribución, puntos de venta y cuarentena aislada." actions={<button className="primary" onClick={() => openForm("warehouse")}><Plus size={18} /> Nuevo Almacén</button>} />
    <div className="cards-grid">{warehouses.map((item) => <article className="panel warehouse-card" key={item.id}><div className="supplier-top"><span className="card-icon"><Warehouse size={25} /></span><Badge tone={item.tipo === "MERMAS_CUARENTENA" ? "amber" : "green"}>{item.tipo}</Badge></div><h2>{item.nombre}</h2><p>Sucursal: {item.sucursal?.nombre || "Sin especificar"}</p><div className="warehouse-metrics"><div><strong>{item.tipo === "PRINCIPAL" ? "Centro" : "Soporte"}</strong><small>Rol Operativo</small></div><div><strong>{item.activo ? "Activo" : "Inactivo"}</strong><small>Estado</small></div></div><div className="card-detail">Sucursal <strong>{item.sucursal?.nombre || "Principal"}</strong></div><button className="text-button" onClick={() => openForm("movement")}>Registrar movimiento aquí <ArrowUpRight size={16} /></button></article>)}</div>
    {!warehouses.length && !loading && <Empty text="No hay almacenes registrados" />}
  </>;
}
