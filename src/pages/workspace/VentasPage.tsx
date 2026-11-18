import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Eye, Plus, Printer, RotateCcw } from "lucide-react";
import { salesApi } from "../../api/services";
import type { Venta } from "../../api/types";
import { Badge, Empty, Modal, Table } from "../../components/UI";
import { date, money } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";
import { ThermalReceipt } from "../../components/ThermalReceipt";
import { errorMessage, PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function VentasPage({ openForm, notify, refreshTrigger }: WorkspacePageProps) {
  const { user } = useAuth();
  const [sales, setSales] = useState<Venta[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // View receipt & Cancellation state
  const [selectedSaleToView, setSelectedSaleToView] = useState<Venta | null>(null);
  const [selectedSaleToCancel, setSelectedSaleToCancel] = useState<Venta | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await salesApi.getVentas().catch(() => []);
    setSales(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  const handleConfirmCancelSale = async () => {
    if (!selectedSaleToCancel) return;
    if (cancelMotivo.trim().length < 30) {
      notify("El motivo de anulación debe tener al menos 30 letras.");
      return;
    }
    setCancelLoading(true);
    try {
      await salesApi.anularVenta(selectedSaleToCancel.id, cancelMotivo.trim());
      notify("Venta anulada y existencias reintegradas al inventario");
      setSelectedSaleToCancel(null);
      setCancelMotivo("");
      await loadData();
    } catch (err: any) {
      notify(errorMessage(err, "No se pudo anular la venta"));
    } finally {
      setCancelLoading(false);
    }
  };

  const query = search.toLowerCase();

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Punto de venta y facturación con deducción atómica de existencias."
        actions={
          <button className="primary" onClick={() => openForm("sale")}>
            <Plus size={18} /> Registrar Venta (POS)
          </button>
        }
      />
      <SearchToolbar value={search} onChange={setSearch} />

      <div className="mini-stats">
        <div>
          <span>Ventas Registradas</span>
          <strong>{sales.length}</strong>
        </div>
        <div>
          <span>Monto Total Facturado</span>
          <strong>{money(sales.reduce((total, sale) => total + Number(sale.total), 0))}</strong>
        </div>
      </div>

      <section className="panel">
        <Table headers={["Comprobante", "Fecha", "Cliente", "Items", "Total (S/)", "Estado", "Acciones"]}>
          {sales
            .filter((s) => `${s.numeroComprobante || ""} ${s.clienteNombre || ""}`.toLowerCase().includes(query))
            .map((s) => {
              const itemCount =
                s.detalles?.reduce((acc, d) => acc + (d.cantidad || 1), 0) || s.detalles?.length || 1;
              const saleTime = new Date(s.fecha).getTime();
              const hoursElapsed = (Date.now() - saleTime) / (1000 * 60 * 60);
              const isWithin24h = hoursElapsed <= 24;
              const canCancel = isWithin24h && s.estado !== "ANULADA";

              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.numeroComprobante}</strong>
                    <small>{s.tipoComprobante}</small>
                  </td>
                  <td>{date(s.fecha)}</td>
                  <td>
                    <strong>{s.clienteNombre || "Público General"}</strong>
                    {s.clienteDocumento && <small>Doc: {s.clienteDocumento}</small>}
                  </td>
                  <td>
                    <span className="badge gray">{itemCount} unid.</span>
                  </td>
                  <td className="quantity">{money(s.total)}</td>
                  <td>
                    <Badge
                      tone={
                        s.estado === "ANULADA"
                          ? "red"
                          : s.estado === "COMPLETADA" || s.estado === "EMITIDA"
                            ? "green"
                            : "amber"
                      }
                    >
                      {s.estado}
                    </Badge>
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSelectedSaleToView(s)}
                        style={{
                          padding: "5px 10px",
                          fontSize: 11,
                          height: 30,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontWeight: 600,
                        }}
                        title="Ver detalle del comprobante / boleta"
                      >
                        <Eye size={13} />
                        <span>Ver boleta</span>
                      </button>

                      {canCancel && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => {
                            setSelectedSaleToCancel(s);
                            setCancelMotivo("");
                          }}
                          style={{
                            padding: "5px 10px",
                            fontSize: 11,
                            height: 30,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            color: "#b91c1c",
                            borderColor: "#fca5a5",
                            background: "#fef2f2",
                            fontWeight: 600,
                          }}
                          title={`Anular boleta (disponible hasta ${Math.max(0, Math.ceil(24 - hoursElapsed))}h restantes)`}
                        >
                          <RotateCcw size={13} />
                          <span>Anular ({Math.max(0, Math.ceil(24 - hoursElapsed))}h)</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
        </Table>
        {!sales.length && !loading && <Empty text="Aún no se han emitido ventas" />}
      </section>

      {/* MODAL VER DETALLE / BOLETA TÉRMICA */}
      {selectedSaleToView && (
        <Modal
          title={`Detalle de Comprobante: ${selectedSaleToView.numeroComprobante}`}
          size="normal"
          onClose={() => setSelectedSaleToView(null)}
        >
          <div style={{ padding: "4px 8px" }}>
            <ThermalReceipt sale={selectedSaleToView} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={() => window.print()}
              >
                <Printer size={15} /> Imprimir Comprobante
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => setSelectedSaleToView(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL ANULAR VENTA */}
      {selectedSaleToCancel && (
        <Modal
          title={`Anular Venta: ${selectedSaleToCancel.numeroComprobante}`}
          onClose={() => {
            if (!cancelLoading) {
              setSelectedSaleToCancel(null);
              setCancelMotivo("");
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
                <strong>Confirmación de anulación de venta:</strong>
                <p style={{ margin: "4px 0 0" }}>
                  Esta acción anulará el comprobante <strong>{selectedSaleToCancel.numeroComprobante}</strong> y reintegrará automáticamente las existencias a los lotes y almacenes de despacho originales.
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
                <div>Comprobante: <strong>{selectedSaleToCancel.numeroComprobante}</strong> ({selectedSaleToCancel.tipoComprobante})</div>
                <div>Monto Total: <strong>S/ {selectedSaleToCancel.total.toFixed(2)}</strong></div>
                <div>Fecha de Emisión: <strong>{new Date(selectedSaleToCancel.fecha).toLocaleString()}</strong></div>
                <div>Usuario Responsable: <strong>{user?.nombre || user?.correo}</strong></div>
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2b3f33" }}>
                Motivo / Justificación de la Anulación <span style={{ color: "#dc2626" }}>* (Mínimo 30 letras obligatorio)</span>
              </span>
              <textarea
                rows={4}
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Ingresa la justificación formal (ej. Error en la cantidad de productos cobrados en caja, solicitado expresamente por el cliente en ventanilla)..."
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 6,
                fontSize: 11,
              }}
            >
              <span
                style={{
                  color: cancelMotivo.trim().length >= 30 ? "#166534" : "#b91c1c",
                  fontWeight: 600,
                }}
              >
                {cancelMotivo.trim().length >= 30
                  ? `✓ Justificación válida (${cancelMotivo.trim().length} caracteres)`
                  : `Faltan ${30 - cancelMotivo.trim().length} letras para cumplir el mínimo de 30`}
              </span>
              <span style={{ color: "#88988b" }}>{cancelMotivo.trim().length} / 30 letras</span>
            </div>

            <div
              className="form-actions"
              style={{
                marginTop: 22,
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setSelectedSaleToCancel(null);
                  setCancelMotivo("");
                }}
                disabled={cancelLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmCancelSale}
                disabled={cancelMotivo.trim().length < 30 || cancelLoading}
                style={{
                  background: "#dc2626",
                  borderColor: "#b91c1c",
                }}
              >
                {cancelLoading ? "Anulando..." : "Confirmar Anulación de Venta"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
