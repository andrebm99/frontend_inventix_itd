import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { salesApi } from "../../api/services";
import type { Venta } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { date, money } from "../../utils/format";
import { PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function VentasPage({ openForm, refreshTrigger }: WorkspacePageProps) {
  const [sales, setSales] = useState<Venta[]>([]); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); salesApi.getVentas().catch(() => []).then((data) => { setSales(data); setLoading(false); }); }, [refreshTrigger]);
  const query = search.toLowerCase();
  return <>
    <PageHeader title="Ventas" description="Punto de venta y facturación con deducción atómica de existencias." actions={<button className="primary" onClick={() => openForm("sale")}><Plus size={18} /> Registrar Venta (POS)</button>} />
    <SearchToolbar value={search} onChange={setSearch} />
    <div className="mini-stats"><div><span>Ventas Registradas</span><strong>{sales.length}</strong></div><div><span>Monto Total Facturado</span><strong>{money(sales.reduce((total, sale) => total + Number(sale.total), 0))}</strong></div></div>
    <section className="panel"><Table headers={["Comprobante", "Fecha", "Cliente", "Total (S/)", "Estado"]}>{sales.filter((sale) => `${sale.numeroComprobante || ""} ${sale.clienteNombre || ""}`.toLowerCase().includes(query)).map((sale) => <tr key={sale.id}><td><strong>{sale.numeroComprobante}</strong><small>{sale.tipoComprobante}</small></td><td>{date(sale.fecha)}</td><td><strong>{sale.clienteNombre || "Público General"}</strong>{sale.clienteDocumento && <small>Doc: {sale.clienteDocumento}</small>}</td><td className="quantity">{money(sale.total)}</td><td><Badge tone="green">{sale.estado}</Badge></td></tr>)}</Table>{!sales.length && !loading && <Empty text="Aún no se han emitido ventas" />}</section>
  </>;
}
