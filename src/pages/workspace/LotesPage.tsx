import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { catalogApi, organizationApi } from "../../api/services";
import type { Almacen, Lote } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { date, daysLeft, money } from "../../utils/format";
import { PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function LotesPage({ refreshTrigger }: WorkspacePageProps) {
  const [lots, setLots] = useState<Lote[]>([]); const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [search, setSearch] = useState(""); const [warehouse, setWarehouse] = useState("Todos"); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); Promise.all([catalogApi.getLotes().catch(() => []), organizationApi.getAlmacenes().catch(() => [])]).then(([loadedLots, loadedWarehouses]) => { setLots(loadedLots); setWarehouses(loadedWarehouses); setLoading(false); }); }, [refreshTrigger]);
  const query = search.toLowerCase();
  return <>
    <PageHeader title="Lotes y vencimientos" description="Trazabilidad FEFO (First-Expired, First-Out) para evitar mermas." />
    <SearchToolbar value={search} onChange={setSearch}><select aria-label="Filtrar almacén" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option value="Todos">Todos los almacenes</option>{warehouses.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select></SearchToolbar>
    <div className="info-banner"><Clock size={24} /><div><strong>Trazabilidad FEFO: First-Expired, First-Out</strong><p>Los lotes se priorizan automáticamente por fecha de vencimiento. Los lotes vencidos quedan bloqueados para venta y se aíslan como mermas.</p></div></div>
    <section className="panel"><Table headers={["Producto", "Número de Lote", "Vencimiento", "Disponible", "Costo Unit.", "Estado"]}>
      {lots.filter((item) => `${item.numeroLote} ${item.producto?.nombre || ""}`.toLowerCase().includes(query) && (warehouse === "Todos" || item.almacen?.nombre === warehouse)).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento)).map((item) => { const left = daysLeft(item.fechaVencimiento); const expired = left < 0; const soon = left >= 0 && left <= 30; return <tr key={item.id}><td><strong>{item.producto?.nombre || "Producto"}</strong><small>{item.producto?.sku}</small></td><td className="mono">{item.numeroLote}</td><td>{date(item.fechaVencimiento)}<small>{expired ? `Venció hace ${Math.abs(left)} días` : `${left} días restantes`}</small></td><td className="quantity">{item.cantidadDisponible}</td><td>{money(item.costoUnitario)}</td><td><Badge tone={expired ? "red" : soon ? "amber" : "green"}>{expired ? "Vencido" : soon ? "Próximo a Vencer" : "Vigente"}</Badge></td></tr>; })}
    </Table>{!lots.length && !loading && <Empty text="No hay lotes registrados" />}</section>
  </>;
}
