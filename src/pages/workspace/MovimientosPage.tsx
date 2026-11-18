import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Plus } from "lucide-react";
import { inventoryApi, organizationApi } from "../../api/services";
import type { Almacen, Movimiento } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { date, downloadCSV } from "../../utils/format";
import { errorMessage, PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function MovimientosPage({ openForm, notify, refreshTrigger }: WorkspacePageProps) {
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [warehouse, setWarehouse] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [loadedMovements, loadedWarehouses] = await Promise.all([
      inventoryApi.getMovimientos().catch(() => []),
      organizationApi.getAlmacenes().catch(() => []),
    ]);
    setMovements(loadedMovements); setWarehouses(loadedWarehouses); setLoading(false);
  }, []);
  useEffect(() => { void loadData(); }, [loadData, refreshTrigger]);

  const changeStatus = async (id: string, action: "approve" | "complete") => {
    try {
      if (action === "approve") await inventoryApi.aprobarMovimiento(id);
      else await inventoryApi.completarMovimiento(id);
      notify(action === "approve" ? "Movimiento aprobado" : "Movimiento completado. Stock actualizado.");
      await loadData();
    } catch (error) { notify(errorMessage(error, "No se pudo actualizar el movimiento")); }
  };
  const exportMovements = () => {
    downloadCSV("inventix-kardex-movimientos", [["Fecha", "Tipo", "Estado", "Motivo", "Almacén"], ...movements.map((item) => [item.fecha, item.tipo, item.estado, item.motivo || "", item.almacenDestino?.nombre || item.almacenOrigen?.nombre || ""])]);
    notify("Reporte de movimientos descargado");
  };
  const query = search.toLowerCase();
  return <>
    <PageHeader title="Movimientos" description="Kardex continuo con ciclo Borrador → Aprobado → Completado." actions={<><button className="secondary" onClick={exportMovements}><Download size={17} /> Exportar Kardex</button><button className="primary" onClick={() => openForm("movement")}><Plus size={18} /> Registrar Movimiento</button></>} />
    <SearchToolbar value={search} onChange={setSearch}>
      <select aria-label="Tipo de movimiento" value={type} onChange={(event) => setType(event.target.value)}><option value="Todos">Todos los tipos</option><option value="ENTRADA_COMPRA">Entrada por Compra</option><option value="SALIDA_VENTA">Salida por Venta</option><option value="TRASLADO_INTERNO">Transferencia</option><option value="SALIDA_MERMA">Merma / Pérdida</option></select>
      <select aria-label="Filtrar almacén" value={warehouse} onChange={(event) => setWarehouse(event.target.value)}><option value="Todos">Todos los almacenes</option>{warehouses.map((item) => <option key={item.id} value={item.nombre}>{item.nombre}</option>)}</select>
    </SearchToolbar>
    <section className="panel"><Table headers={["Fecha", "Operación / Motivo", "Tipo", "Almacén", "Estado", "Acción"]}>
      {movements.filter((item) => `${item.motivo || ""} ${item.tipo}`.toLowerCase().includes(query) && (type === "Todos" || item.tipo === type) && (warehouse === "Todos" || item.almacenDestino?.nombre === warehouse || item.almacenOrigen?.nombre === warehouse)).map((item) => {
        const isIncoming = item.tipo.startsWith("ENTRADA") || item.tipo.includes("POSITIVO");
        return <tr key={item.id}><td>{date(item.fecha)}</td><td><strong>{item.motivo || "Operación de almacén"}</strong><small>Usuario: {item.usuario?.nombre || "Sistema"}</small></td><td><Badge tone={isIncoming ? "green" : "gray"}>{item.tipo}</Badge></td><td>{item.almacenOrigen?.nombre && `${item.almacenOrigen.nombre} → `}{item.almacenDestino?.nombre || "Almacén Principal"}</td><td><Badge tone={item.estado === "COMPLETADO" ? "green" : item.estado === "APROBADO" ? "amber" : item.estado === "ANULADO" ? "red" : "gray"}>{item.estado}</Badge></td><td>
          {item.estado === "BORRADOR" && <button className="secondary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void changeStatus(item.id, "approve")}>Aprobar</button>}
          {item.estado === "APROBADO" && <button className="primary" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => void changeStatus(item.id, "complete")}>Completar</button>}
          {item.estado === "COMPLETADO" && <span style={{ color: "#28634f", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={13} /> Aplicado</span>}
        </td></tr>;
      })}
    </Table>{!movements.length && !loading && <Empty text="No hay movimientos registrados" />}</section>
  </>;
}
