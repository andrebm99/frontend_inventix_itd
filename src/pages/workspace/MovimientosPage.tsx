import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
} from "lucide-react";
import { catalogApi, inventoryApi, organizationApi } from "../../api/services";
import type { Almacen, Movimiento, Producto } from "../../api/types";
import { Badge, Empty, Modal, Table } from "../../components/UI";
import { date, downloadCSV, money } from "../../utils/format";
import { errorMessage, PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function MovimientosPage({ openForm, notify, refreshTrigger }: WorkspacePageProps) {
  const [movements, setMovements] = useState<Movimiento[]>([]);
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Todos");
  const [warehouse, setWarehouse] = useState("Todos");
  const [loading, setLoading] = useState(true);

  // Contextual dropdown & modals
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [selectedViewMovement, setSelectedViewMovement] = useState<Movimiento | null>(null);
  const [cancelMovementTarget, setCancelMovementTarget] = useState<Movimiento | null>(null);
  const [cancelMovementReason, setCancelMovementReason] = useState<string>("");
  const [cancelMovementLoading, setCancelMovementLoading] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [loadedMovements, loadedWarehouses, loadedProducts] = await Promise.all([
      inventoryApi.getMovimientos().catch(() => []),
      organizationApi.getAlmacenes().catch(() => []),
      catalogApi.getProductos().catch(() => []),
    ]);
    setMovements(loadedMovements);
    setWarehouses(loadedWarehouses);
    setProducts(loadedProducts);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".action-menu-container")) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const changeStatus = async (id: string, action: "approve" | "complete") => {
    try {
      if (action === "approve") await inventoryApi.aprobarMovimiento(id);
      else await inventoryApi.completarMovimiento(id);
      notify(action === "approve" ? "Movimiento aprobado" : "Movimiento completado. Stock actualizado.");
      await loadData();
    } catch (error) {
      notify(errorMessage(error, "No se pudo actualizar el movimiento"));
    }
  };

  const handleConfirmCancelMovement = async () => {
    if (!cancelMovementTarget) return;
    setCancelMovementLoading(true);
    try {
      await inventoryApi.anularMovimiento(
        cancelMovementTarget.id,
        cancelMovementReason || "Anulación de movimiento solicitada por el usuario"
      );
      notify("Movimiento anulado correctamente");
      setCancelMovementTarget(null);
      setCancelMovementReason("");
      await loadData();
    } catch (err: any) {
      notify(errorMessage(err, "No se pudo anular el movimiento"));
    } finally {
      setCancelMovementLoading(false);
    }
  };

  const exportMovements = () => {
    downloadCSV("inventix-kardex-movimientos", [
      ["Fecha", "Tipo", "Estado", "Motivo", "Almacén", "Proveedor"],
      ...movements.map((item) => [
        item.fecha,
        item.tipo,
        item.estado,
        item.motivo || "",
        item.almacenDestino?.nombre || item.almacenOrigen?.nombre || "",
        item.proveedor?.razonSocial || item.proveedor?.razon_social || item.proveedor?.nombre || "",
      ]),
    ]);
    notify("Reporte de movimientos descargado");
  };

  const query = search.toLowerCase();

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Kardex continuo con ciclo Borrador → Aprobado → Completado."
        actions={
          <>
            <button className="secondary" onClick={exportMovements}>
              <Download size={17} /> Exportar Kardex
            </button>
            <button className="primary" onClick={() => openForm("movement")}>
              <Plus size={18} /> Registrar Movimiento
            </button>
          </>
        }
      />
      <SearchToolbar value={search} onChange={setSearch}>
        <select
          aria-label="Tipo de movimiento"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="Todos">Todos los tipos</option>
          <option value="ENTRADA_COMPRA">Entrada por Compra</option>
          <option value="SALIDA_VENTA">Salida por Venta</option>
          <option value="TRASLADO_INTERNO">Transferencia</option>
          <option value="SALIDA_MERMA">Merma / Pérdida</option>
          <option value="AJUSTE_INVENTARIO">Ajuste de Inventario</option>
        </select>
        <select
          aria-label="Filtrar almacén"
          value={warehouse}
          onChange={(event) => setWarehouse(event.target.value)}
        >
          <option value="Todos">Todos los almacenes</option>
          {warehouses.map((item) => (
            <option key={item.id} value={item.nombre}>
              {item.nombre}
            </option>
          ))}
        </select>
      </SearchToolbar>

      <section className="panel" style={{ minHeight: 380 }}>
        <Table headers={["Fecha", "Tipo de Movimiento", "Código / Producto", "Almacén", "Estado", "Acción"]}>
          {movements
            .filter((m) => {
              const lineas = m.detalles && m.detalles.length > 0 ? m.detalles : (m.detalle_movimiento || []);
              const prodCodes = lineas
                .map((d: any) => `${d.producto?.sku || ""} ${d.producto?.nombre || ""} ${d.producto?.codigo_barras || ""}`)
                .join(" ");
              return (
                `${m.tipo} ${prodCodes} ${m.motivo || ""}`.toLowerCase().includes(query) &&
                (type === "Todos" || m.tipo === type) &&
                (warehouse === "Todos" ||
                  m.almacenDestino?.nombre === warehouse ||
                  m.almacenOrigen?.nombre === warehouse)
              );
            })
            .map((m) => {
              const isEntrada = m.tipo.startsWith("ENTRADA") || m.tipo.includes("POSITIVO");
              const lineas = m.detalles && m.detalles.length > 0 ? m.detalles : (m.detalle_movimiento || []);
              const firstLine = lineas[0];
              const matchedProd =
                firstLine?.producto ||
                products.find((p) => p.id === (firstLine?.productoId || (firstLine as any)?.producto_id));
              const prodSku =
                matchedProd?.sku ||
                matchedProd?.codigo_barras ||
                (firstLine as any)?.producto_lote?.codigo_lote ||
                "—";
              const prodNombre = matchedProd?.nombre || "Producto asignado";
              const extraCount = lineas.length > 1 ? lineas.length - 1 : 0;

              return (
                <tr key={m.id}>
                  <td>{date(m.fecha)}</td>
                  <td>
                    <Badge tone={isEntrada ? "green" : "gray"}>{m.tipo}</Badge>
                    <div style={{ fontSize: 11, color: "#7a8d80", marginTop: 3 }}>
                      Por: {m.usuario?.nombre || "Sistema"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 700,
                            fontSize: 12,
                            color: "#166534",
                            background: "#eef8f2",
                            padding: "2px 6px",
                            borderRadius: 4,
                            border: "1px solid #c7e6d3",
                          }}
                        >
                          {prodSku}
                        </span>
                        {extraCount > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#556b5b",
                              background: "#e8ece9",
                              padding: "1px 5px",
                              borderRadius: 4,
                            }}
                          >
                            +{extraCount} más
                          </span>
                        )}
                      </div>
                      <small style={{ marginTop: 2, color: "#3b4e41", fontWeight: 500 }}>
                        {prodNombre} {firstLine?.cantidad ? `(${firstLine.cantidad} uds)` : ""}
                      </small>
                    </div>
                  </td>
                  <td>
                    <div>
                      {m.almacenOrigen?.nombre && `${m.almacenOrigen.nombre} → `}
                      {m.almacenDestino?.nombre || "Almacén Principal"}
                    </div>
                    {m.proveedor && (
                      <div style={{ fontSize: 11, color: "#274b33", marginTop: 2 }}>
                        📦 Prov: {m.proveedor.razonSocial || m.proveedor.razon_social || m.proveedor.nombre}
                      </div>
                    )}
                  </td>
                  <td>
                    <Badge
                      tone={
                        m.estado === "COMPLETADO"
                          ? "green"
                          : m.estado === "APROBADO"
                            ? "amber"
                            : m.estado === "ANULADO"
                              ? "red"
                              : "gray"
                      }
                    >
                      {m.estado}
                    </Badge>
                  </td>
                  <td style={{ position: "relative" }}>
                    <div className="action-menu-container" style={{ position: "relative", display: "inline-block" }}>
                      <button
                        type="button"
                        className="icon-button"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 5,
                          borderRadius: 6,
                          background: openActionMenuId === m.id ? "#e2e8e2" : "transparent",
                          border: "1px solid",
                          borderColor: openActionMenuId === m.id ? "#c0cdc2" : "#d8e2d9",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenuId(openActionMenuId === m.id ? null : m.id);
                        }}
                        title="Opciones del movimiento"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openActionMenuId === m.id && (
                        <div
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            marginTop: 4,
                            background: "#ffffff",
                            border: "1px solid #d5dfd6",
                            borderRadius: 8,
                            boxShadow: "0 6px 16px rgba(23, 75, 59, 0.12)",
                            zIndex: 50,
                            minWidth: 165,
                            overflow: "hidden",
                            padding: "4px 0",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedViewMovement(m);
                              setOpenActionMenuId(null);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              width: "100%",
                              padding: "8px 12px",
                              border: "none",
                              background: "none",
                              fontSize: 12,
                              color: "#284435",
                              textAlign: "left",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f5f1")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <Eye size={14} style={{ color: "#28634f" }} />
                            <span>Ver Detalle</span>
                          </button>

                          {m.estado !== "ANULADO" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                openForm("movement", m);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "none",
                                fontSize: 12,
                                color: "#284435",
                                textAlign: "left",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f5f1")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <Pencil size={14} style={{ color: "#b79a60" }} />
                              <span>Editar y Recalcular</span>
                            </button>
                          )}

                          {m.estado === "BORRADOR" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                void changeStatus(m.id, "approve");
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "none",
                                fontSize: 12,
                                color: "#92400e",
                                textAlign: "left",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#fef3c7")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <CheckCircle2 size={14} style={{ color: "#d97706" }} />
                              <span>Aprobar</span>
                            </button>
                          )}

                          {m.estado === "APROBADO" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                void changeStatus(m.id, "complete");
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                background: "none",
                                fontSize: 12,
                                color: "#166534",
                                textAlign: "left",
                                cursor: "pointer",
                                fontWeight: 500,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#dcfce7")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                            >
                              <CheckCircle2 size={14} style={{ color: "#16a34a" }} />
                              <span>Completar</span>
                            </button>
                          )}

                          {m.estado !== "ANULADO" && (
                            <div style={{ borderTop: "1px solid #edf2ee", margin: "4px 0" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setCancelMovementTarget(m);
                                  setCancelMovementReason("");
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "none",
                                  background: "none",
                                  fontSize: 12,
                                  color: "#dc2626",
                                  textAlign: "left",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <Ban size={14} style={{ color: "#dc2626" }} />
                                <span>Anular Movimiento</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </Table>
        {!movements.length && !loading && <Empty text="No hay movimientos registrados" />}
      </section>

      {/* MODAL VER DETALLE DEL MOVIMIENTO */}
      {selectedViewMovement && (
        <Modal
          title={`Detalle de Movimiento: ${selectedViewMovement.tipo}`}
          size="wide"
          onClose={() => setSelectedViewMovement(null)}
        >
          <div style={{ padding: "4px 10px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 12,
                background: "#f7f9f7",
                padding: 14,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Estado:</span>
                <Badge
                  tone={
                    selectedViewMovement.estado === "COMPLETADO"
                      ? "green"
                      : selectedViewMovement.estado === "APROBADO"
                        ? "amber"
                        : selectedViewMovement.estado === "ANULADO"
                          ? "red"
                          : "gray"
                  }
                >
                  {selectedViewMovement.estado}
                </Badge>
              </div>
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Fecha y Hora:</span>
                <strong>{new Date(selectedViewMovement.fecha).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Almacén Origen:</span>
                <strong>{selectedViewMovement.almacenOrigen?.nombre || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Almacén Destino:</span>
                <strong>{selectedViewMovement.almacenDestino?.nombre || "—"}</strong>
              </div>
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Usuario Responsable:</span>
                <strong>{selectedViewMovement.usuario?.nombre || "Sistema"}</strong>
              </div>
              <div>
                <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Motivo / Referencia:</span>
                <strong>{selectedViewMovement.motivo || "Sin motivo especificado"}</strong>
              </div>
              {selectedViewMovement.proveedor && (
                <div>
                  <span style={{ color: "#687b6e", display: "block", marginBottom: 2 }}>Proveedor Asignado:</span>
                  <strong>
                    {selectedViewMovement.proveedor.razonSocial ||
                      selectedViewMovement.proveedor.razon_social ||
                      selectedViewMovement.proveedor.nombre ||
                      "—"}
                    {selectedViewMovement.proveedor.ruc ? ` (RUC: ${selectedViewMovement.proveedor.ruc})` : ""}
                  </strong>
                </div>
              )}
            </div>

            {/* Line items table */}
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "#24372b", marginBottom: 8 }}>
                Líneas de Productos del Movimiento
              </h3>
              <div style={{ overflowX: "auto", border: "1px solid #e1e8e2", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ background: "#f3f6f3", textAlign: "left", color: "#4d6253" }}>
                    <tr>
                      <th style={{ padding: "8px 12px" }}>Producto / SKU</th>
                      <th style={{ padding: "8px 12px" }}>Lote / Vencimiento</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Cantidad</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Costo Unitario</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      selectedViewMovement.detalles?.length > 0
                        ? selectedViewMovement.detalles
                        : (selectedViewMovement.detalle_movimiento || []).map((d: any) => ({
                            id: d.id,
                            productoId: d.producto_id,
                            cantidad: d.cantidad,
                            costoUnitario: Number(d.costo_unitario || 0),
                            producto: d.producto,
                            lote: d.producto_lote
                              ? {
                                  id: d.producto_lote.id,
                                  codigoLote: d.producto_lote.codigo_lote,
                                  fechaVencimiento: d.producto_lote.fecha_vencimiento,
                                }
                              : undefined,
                          }))
                    ).map((line, idx) => {
                      const prod =
                        line.producto || products.find((p) => p.id === (line.productoId || (line as any).producto_id));
                      const subtotal = Number(line.cantidad || 0) * Number(line.costoUnitario || 0);
                      return (
                        <tr key={idx} style={{ borderTop: "1px solid #edf2ee" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <strong>{prod?.nombre || "Producto"}</strong>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: "#166534" }}>
                              SKU: {prod?.sku || (line as any).sku || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {line.lote ? (
                              <div>
                                <span>{line.lote.codigoLote}</span>
                                {line.lote.fechaVencimiento && (
                                  <small style={{ color: "#7a8d80", display: "block" }}>
                                    Vence: {String(line.lote.fechaVencimiento).split("T")[0]}
                                  </small>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: "#8c9b90" }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                            {line.cantidad} uds
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            {money(line.costoUnitario || 0)}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>
                            {money(subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ background: "#f8faf8", fontWeight: 700 }}>
                    <tr style={{ borderTop: "2px solid #dde5de" }}>
                      <td colSpan={2} style={{ padding: "8px 12px" }}>
                        Totales del Movimiento:
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        {(
                          selectedViewMovement.detalles || selectedViewMovement.detalle_movimiento || []
                        ).reduce((acc: number, cur: any) => acc + Number(cur.cantidad || 0), 0)}{" "}
                        uds
                      </td>
                      <td style={{ padding: "8px 12px" }}></td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "#174b3b" }}>
                        {money(
                          (
                            selectedViewMovement.detalles || selectedViewMovement.detalle_movimiento || []
                          ).reduce(
                            (acc: number, cur: any) =>
                              acc +
                              Number(cur.cantidad || 0) *
                                Number(cur.costoUnitario || cur.costo_unitario || 0),
                            0
                          )
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              {selectedViewMovement.estado !== "ANULADO" && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#dc2626" }}
                    onClick={() => {
                      const target = selectedViewMovement;
                      setSelectedViewMovement(null);
                      setCancelMovementTarget(target);
                      setCancelMovementReason("");
                    }}
                  >
                    <Ban size={15} /> Anular Movimiento
                  </button>
                  <button
                    type="button"
                    className="primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={() => {
                      const target = selectedViewMovement;
                      setSelectedViewMovement(null);
                      openForm("movement", target);
                    }}
                  >
                    <Pencil size={15} /> Editar y Recalcular
                  </button>
                </>
              )}
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedViewMovement(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ANULAR MOVIMIENTO */}
      {cancelMovementTarget && (
        <Modal
          title={`Anular Movimiento: ${cancelMovementTarget.tipo}`}
          onClose={() => {
            if (!cancelMovementLoading) {
              setCancelMovementTarget(null);
              setCancelMovementReason("");
            }
          }}
        >
          <div style={{ padding: "4px 10px" }}>
            <div
              style={{
                display: "flex",
                gap: 12,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: 14,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={24} style={{ color: "#dc2626", flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5 }}>
                <strong>¿Confirmar anulación del movimiento?</strong>
                <p style={{ margin: "4px 0 0" }}>
                  {cancelMovementTarget.estado === "COMPLETADO"
                    ? "Este movimiento ya fue completado y afectó existencias. Al anularlo, el sistema revertirá físicamente el stock de los productos involucrados en sus almacenes correspondientes."
                    : `Este movimiento está en estado ${cancelMovementTarget.estado}. Al anularlo quedará registrado como ANULADO en el kárdex sin alterar existencias.`}
                </p>
              </div>
            </div>

            <div
              style={{
                background: "#f8faf7",
                border: "1px solid #dce4dc",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                <div>Operación: <strong>{cancelMovementTarget.tipo}</strong></div>
                <div>Estado Actual: <strong>{cancelMovementTarget.estado}</strong></div>
                <div>Fecha: <strong>{new Date(cancelMovementTarget.fecha).toLocaleString()}</strong></div>
                <div>
                  Almacén:{" "}
                  <strong>
                    {cancelMovementTarget.almacenDestino?.nombre ||
                      cancelMovementTarget.almacenOrigen?.nombre ||
                      "—"}
                  </strong>
                </div>
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2b3f33" }}>
                Motivo / Justificación de la Anulación (Opcional)
              </span>
              <textarea
                rows={3}
                value={cancelMovementReason}
                onChange={(e) => setCancelMovementReason(e.target.value)}
                placeholder="Indica el motivo de la anulación (ej. Error en el conteo de unidades ingresadas, devolución de mercadería no autorizada, duplicación)..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: 8,
                  border: "1px solid #d0dad1",
                  padding: 10,
                  fontSize: 12,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </label>

            <div
              className="form-actions"
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCancelMovementTarget(null);
                  setCancelMovementReason("");
                }}
                disabled={cancelMovementLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmCancelMovement}
                disabled={cancelMovementLoading}
                style={{
                  background: "#dc2626",
                  borderColor: "#b91c1c",
                }}
              >
                {cancelMovementLoading ? "Anulando..." : "Confirmar Anulación"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
