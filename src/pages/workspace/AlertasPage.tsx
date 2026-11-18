import { useEffect, useState } from "react";
import { Clock, Package } from "lucide-react";
import { catalogApi, inventoryApi } from "../../api/services";
import type { Lote, Producto, StockAlmacen } from "../../api/types";
import { Badge, Empty } from "../../components/UI";
import { date, daysLeft } from "../../utils/format";
import { getProductStock, PageHeader, type WorkspacePageProps } from "./shared";

export function AlertasPage({ refreshTrigger }: WorkspacePageProps) {
  const [products, setProducts] = useState<Producto[]>([]); const [stock, setStock] = useState<StockAlmacen[]>([]); const [lots, setLots] = useState<Lote[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); Promise.all([catalogApi.getProductos().catch(() => []), inventoryApi.getStock().catch(() => []), catalogApi.getLotes().catch(() => [])]).then(([loadedProducts, loadedStock, loadedLots]) => { setProducts(loadedProducts); setStock(loadedStock); setLots(loadedLots); setLoading(false); }); }, [refreshTrigger]);
  const lowStock = products.filter((product) => getProductStock(stock, product.id) <= product.stockMinimo); const expiring = lots.filter((lot) => lot.cantidadDisponible > 0 && daysLeft(lot.fechaVencimiento) <= 30);
  return <><PageHeader title="Alertas" description="Atención prioritaria de quiebres de stock y lotes próximos a caducar." /><div className="alert-list">{lowStock.map((product) => { const current = getProductStock(stock, product.id); return <article className="panel alert-row" key={product.id}><span className="attention-icon red"><Package size={22} /></span><div><h2>{current === 0 ? "Quiebre de Stock" : "Stock por Debajo del Mínimo"} · {product.nombre}</h2><p>Stock actual: <strong>{current}</strong> {product.unidadMedida?.simbolo || "UND"} · Mínimo configurado: {product.stockMinimo}</p></div><Badge tone="red">Reponer Inmediatamente</Badge></article>; })}{expiring.map((lot) => { const left = daysLeft(lot.fechaVencimiento); return <article className="panel alert-row" key={lot.id}><span className="attention-icon amber"><Clock size={22} /></span><div><h2>{left < 0 ? "Lote Vencido (Aislar Merma)" : "Próximo a Vencer"} · {lot.producto?.nombre || "Producto"}</h2><p>Lote: <strong>{lot.numeroLote}</strong> · {lot.cantidadDisponible} unidades · Vence: {date(lot.fechaVencimiento)}</p></div><Badge tone={left < 0 ? "red" : "amber"}>{left < 0 ? "Bloqueado" : "Priorizar FEFO"}</Badge></article>; })}{!lowStock.length && !expiring.length && !loading && <Empty text="No hay alertas activas" />}</div></>;
}
