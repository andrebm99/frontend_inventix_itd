import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { catalogApi } from "../../api/services";
import type { Producto } from "../../api/types";
import { Empty } from "../../components/UI";
import { PageHeader, type WorkspacePageProps } from "./shared";

export function PronosticosPage({ refreshTrigger }: WorkspacePageProps) {
  const [products, setProducts] = useState<Producto[]>([]); const [selectedProduct, setSelectedProduct] = useState(""); const [horizon, setHorizon] = useState(30);
  useEffect(() => { catalogApi.getProductos().catch(() => []).then((data) => { setProducts(data); setSelectedProduct((current) => current || data[0]?.id || ""); }); }, [refreshTrigger]);
  return <><PageHeader title="Pronósticos" description="Proyección de demanda a partir del historial real de ventas." /><div className="info-banner"><TrendingUp size={24} /><div><strong>Pronóstico de demanda</strong><p>La proyección utilizará exclusivamente el historial de ventas registrado para el producto seleccionado.</p></div></div><section className="panel"><div className="panel-heading"><div><h2>Consulta por producto</h2><p>Selecciona el artículo y el horizonte que deseas evaluar.</p></div><div className="segmented">{[30, 60, 90].map((days) => <button key={days} className={horizon === days ? "selected" : ""} onClick={() => setHorizon(days)}>{days} días</button>)}</div></div><div className="forecast-controls"><label htmlFor="forecast-product">Producto</label><select id="forecast-product" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.nombre}</option>)}</select></div><Empty text={`Aún no hay una proyección de ${horizon} días disponible. Se necesita historial de ventas suficiente para evitar resultados imprecisos.`} /></section></>;
}
