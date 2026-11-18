import { useEffect, useState } from "react";
import { Download, Package, Pencil, Plus } from "lucide-react";
import { catalogApi, inventoryApi, organizationApi } from "../../api/services";
import type { Almacen, Categoria, Producto, StockAlmacen } from "../../api/types";
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
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [warehouseFilter, setWarehouseFilter] = useState("Todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      catalogApi.getProductos().catch(() => []),
      catalogApi.getCategorias().catch(() => []),
      inventoryApi.getStock().catch(() => []),
      organizationApi.getAlmacenes().catch(() => []),
    ]).then(([loadedProducts, loadedCategories, loadedStock, loadedWarehouses]) => {
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setStock(loadedStock);
      setWarehouses(loadedWarehouses);
      setLoading(false);
    });
  }, [refreshTrigger]);

  const getProductStockInWarehouse = (prodId: string, whName: string) => {
    if (whName === "Todos") return getProductStock(stock, prodId);
    const targetWh = warehouses.find((w) => w.nombre === whName || w.id === whName);
    if (!targetWh) return 0;
    const item = stock.find((s) => s.productoId === prodId && s.almacenId === targetWh.id);
    return item ? Number(item.cantidad) : 0;
  };

  const exportProducts = () => {
    downloadCSV("inventix-productos", [
      [
        "SKU",
        "Producto",
        "Categoría",
        warehouseFilter === "Todos" ? "Stock Total" : `Stock en ${warehouseFilter}`,
        "Costo Promedio",
        "Precio Venta",
        "Valorizado Costo",
      ],
      ...products.map((product) => {
        const currentStock = getProductStockInWarehouse(product.id, warehouseFilter);
        return [
          product.sku,
          product.nombre,
          product.categoria?.nombre || "General",
          currentStock,
          product.costoPromedio,
          product.precioVenta,
          currentStock * product.costoPromedio,
        ];
      }),
    ]);
    notify("Reporte de productos descargado en CSV");
  };

  const query = search.toLowerCase();
  const stockHeader = warehouseFilter === "Todos" ? "Stock Total" : `Stock en ${warehouseFilter}`;

  return (
    <>
      <PageHeader
        title="Productos"
        description="Catálogo valorizado en tiempo real con control de SKU y costos."
        actions={
          <>
            <button className="secondary" onClick={exportProducts}>
              <Download size={17} /> Exportar CSV
            </button>
            <button className="primary" onClick={() => openForm("product")}>
              <Plus size={18} /> Nuevo Producto
            </button>
          </>
        }
      />
      <SearchToolbar value={search} onChange={setSearch}>
        <select
          aria-label="Filtrar categoría"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="Todos">Todas las categorías</option>
          {categories.map((item) => (
            <option key={item.id} value={item.nombre}>
              {item.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar almacén"
          value={warehouseFilter}
          onChange={(event) => setWarehouseFilter(event.target.value)}
        >
          <option value="Todos">Todos los almacenes</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.nombre}>
              {item.nombre}
            </option>
          ))}
        </select>
      </SearchToolbar>
      <section className="panel">
        <Table
          headers={[
            "Producto / SKU",
            "Categoría",
            stockHeader,
            "Costo Promedio",
            "Precio Venta",
            "Estado",
            "Acción",
          ]}
        >
          {products
            .filter(
              (product) =>
                `${product.nombre} ${product.sku}`.toLowerCase().includes(query) &&
                (category === "Todos" || product.categoria?.nombre === category)
            )
            .map((product) => {
              const quantity = getProductStockInWarehouse(product.id, warehouseFilter);
              const totalStock = getProductStock(stock, product.id);
              const isOut = quantity === 0;
              const isLow = quantity <= product.stockMinimo;
              return (
                <tr key={product.id}>
                  <td>
                    <div className="product-cell">
                      <span className="product-icon">
                        <Package size={20} />
                      </span>
                      <div>
                        <strong>{product.nombre}</strong>
                        <small>
                          {product.sku} {product.codigoBarras ? `· ${product.codigoBarras}` : ""}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{product.categoria?.nombre || "General"}</td>
                  <td>
                    <strong>{quantity}</strong>{" "}
                    <small className="inline">{product.unidadMedida?.simbolo || "UND"}</small>
                    {warehouseFilter !== "Todos" && (
                      <div style={{ fontSize: 10, color: "#687b6e" }}>
                        Total: {totalStock}
                      </div>
                    )}
                  </td>
                  <td>{money(product.costoPromedio)}</td>
                  <td>{money(product.precioVenta)}</td>
                  <td>
                    <Badge tone={isOut ? "red" : isLow ? "amber" : "green"}>
                      {isOut ? "Agotado" : isLow ? "Stock Bajo" : "Disponible"}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${product.nombre}`}
                      onClick={() => openForm("product", product)}
                      title="Editar producto"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
        </Table>
        {!products.length && !loading && <Empty text="No se encontraron productos registrados" />}
        <div className="table-footer">
          {products.length} productos registrados · Trazabilidad y costos en tiempo real
        </div>
      </section>
    </>
  );
}
