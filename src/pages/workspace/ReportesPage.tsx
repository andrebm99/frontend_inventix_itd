import { useEffect, useState } from "react";
import { Clock, Download, FileSpreadsheet, Printer } from "lucide-react";
import { catalogApi, inventoryApi, reportsApi } from "../../api/services";
import type { Movimiento, Producto, StockAlmacen } from "../../api/types";
import { Table } from "../../components/UI";
import { date, downloadCSV, money } from "../../utils/format";
import { errorMessage, getProductStock, PageHeader, type WorkspacePageProps } from "./shared";

interface KardexLine {
  cantidad?: number;
  costo_unitario?: number;
  lote?: { numero_lote?: string };
  movimiento?: {
    fecha?: string;
    tipo?: string;
    motivo?: string;
    almacenDestino?: { nombre: string };
    almacenOrigen?: { nombre: string };
  };
}

export function ReportesPage({ notify, refreshTrigger }: WorkspacePageProps) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockAlmacen[]>([]);
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [kardex, setKardex] = useState<KardexLine[]>([]);

  useEffect(() => {
    Promise.all([
      catalogApi.getProductos().catch(() => []),
      inventoryApi.getStock().catch(() => []),
      inventoryApi.getMovimientos().catch(() => []),
    ]).then(([loadedProducts, loadedStock, loadedMovements]) => {
      setProducts(loadedProducts);
      setStock(loadedStock);
      setMovements(loadedMovements);
      setSelectedProduct((current) => current || loadedProducts[0]?.id || "");
    });
  }, [refreshTrigger]);

  useEffect(() => {
    if (!selectedProduct) { setKardex([]); return; }
    reportsApi.getKardex(selectedProduct).then((data) => setKardex(data as KardexLine[])).catch(() => setKardex([]));
  }, [selectedProduct]);

  const exportProducts = () => {
    downloadCSV("inventix-productos", [
      ["SKU", "Producto", "Categoría", "Stock Total", "Costo Promedio", "Precio Venta", "Valorizado Costo"],
      ...products.map((product) => {
        const current = getProductStock(stock, product.id);
        return [product.sku, product.nombre, product.categoria?.nombre || "General", current, product.costoPromedio, product.precioVenta, current * product.costoPromedio];
      }),
    ]);
    notify("Reporte de productos descargado en CSV");
  };
  const exportMovements = () => {
    downloadCSV("inventix-kardex-movimientos", [["Fecha", "Tipo", "Estado", "Motivo", "Almacén"], ...movements.map((item) => [item.fecha, item.tipo, item.estado, item.motivo || "", item.almacenDestino?.nombre || item.almacenOrigen?.nombre || ""])]);
    notify("Reporte de movimientos descargado");
  };
  const runClosing = async () => {
    try { const result = await reportsApi.ejecutarCierre(); notify(`Cierre ejecutado: ${result.registros} almacenes consolidados.`); }
    catch (error) { notify(errorMessage(error, "Error al ejecutar cierre")); }
  };

  return <>
    <PageHeader title="Reportes" description="Kardex formal, valorización de inventario y mermas exportables." />
    <div className="cards-grid report-options">
      <article className="panel report-card"><span className="card-icon"><FileSpreadsheet size={24} /></span><h2>Catálogo Valorizado</h2><p>Existencias físicas, costo promedio ponderado y valor económico total.</p><button className="primary full" onClick={exportProducts}><Download size={16} /> Descargar CSV</button><button className="secondary full" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button></article>
      <article className="panel report-card"><span className="card-icon"><Download size={24} /></span><h2>Trazabilidad de Movimientos</h2><p>Historial completo de entradas, salidas, traslados y mermas con autorizaciones.</p><button className="primary full" onClick={exportMovements}><Download size={16} /> Descargar CSV</button><button className="secondary full" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</button></article>
      <article className="panel report-card"><span className="card-icon"><Clock size={24} /></span><h2>Cierre Diario de Inventario</h2><p>Ejecutar snapshot formal de inventario para auditoría y consistencia contable.</p><button className="secondary full" style={{ marginTop: 24 }} onClick={() => void runClosing()}>Ejecutar Cierre Diario</button></article>
    </div>
    <h2 className="section-title">Consulta de Kardex Detallado por Producto</h2>
    <section className="panel" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}><label style={{ fontSize: 12, fontWeight: 600 }}>Seleccionar Producto:</label><select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} style={{ minWidth: 260 }}>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.nombre}</option>)}</select></div>
      <Table headers={["Fecha", "Operación", "Almacén", "Cantidad", "Costo Unitario", "Lote"]}>{kardex.map((line, index) => <tr key={index}><td>{date(line.movimiento?.fecha || new Date().toISOString())}</td><td><strong>{line.movimiento?.tipo}</strong><small>{line.movimiento?.motivo}</small></td><td>{line.movimiento?.almacenDestino?.nombre || line.movimiento?.almacenOrigen?.nombre || "Principal"}</td><td className="quantity">{line.cantidad}</td><td>{money(line.costo_unitario || 0)}</td><td className="mono">{line.lote?.numero_lote || "—"}</td></tr>)}</Table>
      {!kardex.length && <p style={{ textAlign: "center", color: "#889988", padding: "20px 0" }}>No hay movimientos registrados para este producto.</p>}
    </section>
  </>;
}
