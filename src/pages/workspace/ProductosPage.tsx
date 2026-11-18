import { useEffect, useState } from "react";
import { Download, Package, Pencil, Plus } from "lucide-react";
import { catalogApi, inventoryApi } from "../../api/services";
import type { Categoria, Producto, StockAlmacen } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { downloadCSV, money } from "../../utils/format";
import {
  getProductStock,
  PageHeader,
  SearchToolbar,
  type WorkspacePageProps,
} from "./shared";

export function ProductosPage({ openForm, notify, refreshTrigger }: WorkspacePageProps) {
  const [products, setProducts] = useState<Producto[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [stock, setStock] = useState<StockAlmacen[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      catalogApi.getProductos().catch(() => []),
      catalogApi.getCategorias().catch(() => []),
      inventoryApi.getStock().catch(() => []),
    ]).then(([loadedProducts, loadedCategories, loadedStock]) => {
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setStock(loadedStock);
      setLoading(false);
    });
  }, [refreshTrigger]);

  const exportProducts = () => {
    downloadCSV("inventix-productos", [
      ["SKU", "Producto", "Categoría", "Stock Total", "Costo Promedio", "Precio Venta", "Valorizado Costo"],
      ...products.map((product) => {
        const currentStock = getProductStock(stock, product.id);
        return [product.sku, product.nombre, product.categoria?.nombre || "General", currentStock, product.costoPromedio, product.precioVenta, currentStock * product.costoPromedio];
      }),
    ]);
    notify("Reporte de productos descargado en CSV");
  };

  const query = search.toLowerCase();
  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo valorizado en tiempo real con control de SKU y costos."
        actions={<><button className="secondary" onClick={exportProducts}><Download size={17} /> Exportar CSV</button><button className="primary" onClick={() => openForm("product")}><Plus size={18} /> Nuevo Producto</button></>}
      />
      <SearchToolbar value={search} onChange={setSearch}>
        <select aria-label="Filtrar categoría" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="Todos">Todas las categorías</option>
          {categories.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}
        </select>
      </SearchToolbar>
      <section className="panel">
        <Table headers={["Producto / SKU", "Categoría", "Stock Total", "Costo Promedio", "Precio Venta", "Estado", "Acción"]}>
          {products.filter((product) => `${product.nombre} ${product.sku}`.toLowerCase().includes(query) && (category === "Todos" || product.categoria?.nombre === category)).map((product) => {
            const quantity = getProductStock(stock, product.id);
            const isOut = quantity === 0;
            const isLow = quantity <= product.stockMinimo;
            return <tr key={product.id}>
              <td><div className="product-cell"><span className="product-icon"><Package size={20} /></span><div><strong>{product.nombre}</strong><small>{product.sku} {product.codigoBarras ? `· ${product.codigoBarras}` : ""}</small></div></div></td>
              <td>{product.categoria?.nombre || "General"}</td>
              <td><strong>{quantity}</strong> <small className="inline">{product.unidadMedida?.simbolo || "UND"}</small></td>
              <td>{money(product.costoPromedio)}</td><td>{money(product.precioVenta)}</td>
              <td><Badge tone={isOut ? "red" : isLow ? "amber" : "green"}>{isOut ? "Agotado" : isLow ? "Stock Bajo" : "Disponible"}</Badge></td>
              <td><button className="icon-button" aria-label={`Editar ${product.nombre}`} onClick={() => openForm("product", product)} title="Editar producto"><Pencil size={16} /></button></td>
            </tr>;
          })}
        </Table>
        {!products.length && !loading && <Empty text="No se encontraron productos registrados" />}
        <div className="table-footer">{products.length} productos registrados · Trazabilidad y costos en tiempo real</div>
      </section>
    </>
  );
}
