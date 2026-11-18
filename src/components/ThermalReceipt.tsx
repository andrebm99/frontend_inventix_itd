import { Ban } from "lucide-react";
import type { Venta } from "../api/types";

interface ThermalReceiptProps {
  sale: Venta;
  businessName?: string;
  businessRuc?: string;
  userName?: string;
}

export function ThermalReceipt({
  sale,
  businessName = "BODEGA INVENTIX DEMO",
  businessRuc = "20999999991",
  userName = "Cajero Principal",
}: ThermalReceiptProps) {
  const isAnulada = sale.estado === "ANULADA";
  const saleDate = new Date(sale.fecha);
  const formattedDate = saleDate.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = saleDate.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const subtotal = sale.subtotal ?? Number((sale.total / 1.18).toFixed(2));
  const impuesto = sale.impuesto ?? Number((sale.total - subtotal).toFixed(2));

  return (
    <div className="thermal-ticket-container">
      {/* HEADER DE LA EMPRESA */}
      <div className="thermal-center">
        <div className="thermal-bold thermal-title">{businessName.toUpperCase()}</div>
        <div className="thermal-line">RUC: {businessRuc}</div>
        <div className="thermal-line">{sale.sucursal?.nombre || "Sucursal Principal"}</div>
        <div className="thermal-line">{sale.almacen?.nombre || "Almacén Central"}</div>
        <div className="thermal-line">Lima - Perú</div>
      </div>

      <div className="thermal-dashed" />

      {/* TIPO Y NUMERO DE COMPROBANTE */}
      <div className="thermal-center">
        <div className="thermal-bold thermal-subtitle">
          {sale.tipoComprobante === "FACTURA"
            ? "FACTURA ELECTRÓNICA"
            : sale.tipoComprobante === "TICKET"
              ? "TICKET DE VENTA"
              : "BOLETA DE VENTA ELECTRÓNICA"}
        </div>
        <div className="thermal-bold thermal-invoice-no">
          {sale.numeroComprobante}
        </div>
      </div>

      <div className="thermal-dashed" />

      {/* METADATOS DE EMISIÓN */}
      <div className="thermal-meta">
        <div><span>FECHA:</span> {formattedDate} {formattedTime}</div>
        <div><span>CAJERO:</span> {sale.usuario?.nombre || userName}</div>
        <div><span>CLIENTE:</span> {sale.clienteNombre || "CLIENTE MOSTRADOR"}</div>
        {sale.clienteDocumento && (
          <div><span>DOC/DNI:</span> {sale.clienteDocumento}</div>
        )}
        <div><span>ESTADO:</span> <strong>{sale.estado}</strong></div>
      </div>

      {/* ALERTA DE ANULACIÓN SI APLICA */}
      {isAnulada && (
        <div className="thermal-cancel-box">
          <div className="thermal-bold thermal-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Ban size={13} /> *** COMPROBANTE ANULADO ***
          </div>
          <div><strong>MOTIVO:</strong> {sale.anulacion?.motivo || "Anulación de venta y restitución de inventario."}</div>
          <div><strong>POR:</strong> {sale.anulacion?.usuario?.nombre || "Usuario Administrador"}</div>
          {sale.anulacion?.fecha && (
            <div><strong>FECHA ANUL.:</strong> {new Date(sale.anulacion.fecha).toLocaleString()}</div>
          )}
        </div>
      )}

      <div className="thermal-dashed" />

      {/* CABECERA DE ITEMS */}
      <div className="thermal-table-header">
        <span className="th-qty">CANT</span>
        <span className="th-desc">DESCRIPCIÓN</span>
        <span className="th-price">P.UNIT</span>
        <span className="th-total">TOTAL</span>
      </div>

      <div className="thermal-dotted" />

      {/* ITEMS */}
      <div className="thermal-items-list">
        {sale.detalles.map((d, i) => (
          <div key={d.id || i} className="thermal-item-row">
            <div className="thermal-item-top">
              <span className="th-qty">{d.cantidad}</span>
              <span className="th-desc thermal-bold">{d.producto?.nombre || "Producto"}</span>
              <span className="th-price">{d.precioUnitario.toFixed(2)}</span>
              <span className="th-total thermal-bold">{d.subtotal.toFixed(2)}</span>
            </div>
            {d.producto?.sku && (
              <div className="thermal-item-sku">SKU: {d.producto.sku}</div>
            )}
          </div>
        ))}
      </div>

      <div className="thermal-dashed" />

      {/* TOTALES */}
      <div className="thermal-totals">
        <div className="thermal-row">
          <span>OP. GRAVADA:</span>
          <span>S/ {subtotal.toFixed(2)}</span>
        </div>
        <div className="thermal-row">
          <span>I.G.V. (18%):</span>
          <span>S/ {impuesto.toFixed(2)}</span>
        </div>
        <div className="thermal-row thermal-bold thermal-grand-total">
          <span>TOTAL A PAGAR:</span>
          <span>S/ {sale.total.toFixed(2)}</span>
        </div>
      </div>

      <div className="thermal-double-line" />

      {/* METODO DE PAGO */}
      <div className="thermal-payments">
        <div className="thermal-bold">PAGO:</div>
        {sale.pagos && sale.pagos.length > 0 ? (
          sale.pagos.map((p, idx) => (
            <div key={p.id || idx} className="thermal-row">
              <span>{p.metodoPago?.nombre || "EFECTIVO"}:</span>
              <span>S/ {p.monto.toFixed(2)} {p.referencia ? `(${p.referencia})` : ""}</span>
            </div>
          ))
        ) : (
          <div className="thermal-row">
            <span>EFECTIVO:</span>
            <span>S/ {sale.total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="thermal-dashed" />

      {/* CODIGO DE BARRAS TÉRMICO */}
      <div className="thermal-barcode-section">
        <svg className="thermal-barcode-svg" viewBox="0 0 200 40" width="100%" height="36">
          <rect x="5" y="0" width="2" height="35" fill="#000" />
          <rect x="9" y="0" width="1" height="35" fill="#000" />
          <rect x="12" y="0" width="4" height="35" fill="#000" />
          <rect x="18" y="0" width="2" height="35" fill="#000" />
          <rect x="23" y="0" width="3" height="35" fill="#000" />
          <rect x="28" y="0" width="1" height="35" fill="#000" />
          <rect x="31" y="0" width="5" height="35" fill="#000" />
          <rect x="38" y="0" width="2" height="35" fill="#000" />
          <rect x="42" y="0" width="4" height="35" fill="#000" />
          <rect x="48" y="0" width="1" height="35" fill="#000" />
          <rect x="52" y="0" width="3" height="35" fill="#000" />
          <rect x="57" y="0" width="2" height="35" fill="#000" />
          <rect x="62" y="0" width="4" height="35" fill="#000" />
          <rect x="68" y="0" width="2" height="35" fill="#000" />
          <rect x="73" y="0" width="3" height="35" fill="#000" />
          <rect x="78" y="0" width="5" height="35" fill="#000" />
          <rect x="85" y="0" width="2" height="35" fill="#000" />
          <rect x="90" y="0" width="4" height="35" fill="#000" />
          <rect x="96" y="0" width="1" height="35" fill="#000" />
          <rect x="100" y="0" width="3" height="35" fill="#000" />
          <rect x="105" y="0" width="2" height="35" fill="#000" />
          <rect x="110" y="0" width="5" height="35" fill="#000" />
          <rect x="117" y="0" width="2" height="35" fill="#000" />
          <rect x="122" y="0" width="3" height="35" fill="#000" />
          <rect x="127" y="0" width="4" height="35" fill="#000" />
          <rect x="133" y="0" width="2" height="35" fill="#000" />
          <rect x="138" y="0" width="3" height="35" fill="#000" />
          <rect x="143" y="0" width="1" height="35" fill="#000" />
          <rect x="147" y="0" width="4" height="35" fill="#000" />
          <rect x="153" y="0" width="2" height="35" fill="#000" />
          <rect x="158" y="0" width="4" height="35" fill="#000" />
          <rect x="164" y="0" width="2" height="35" fill="#000" />
          <rect x="168" y="0" width="3" height="35" fill="#000" />
          <rect x="174" y="0" width="2" height="35" fill="#000" />
          <rect x="178" y="0" width="4" height="35" fill="#000" />
          <rect x="184" y="0" width="2" height="35" fill="#000" />
          <rect x="188" y="0" width="3" height="35" fill="#000" />
          <rect x="193" y="0" width="2" height="35" fill="#000" />
        </svg>
        <div className="thermal-barcode-code">*{sale.numeroComprobante}*</div>
        <div className="thermal-hash">H-HASH: {sale.id.slice(0, 8)}-{sale.id.slice(-6)}</div>
      </div>

      <div className="thermal-dashed" />

      {/* FOOTER */}
      <div className="thermal-center thermal-footer">
        <div className="thermal-bold">¡GRACIAS POR SU PREFERENCIA!</div>
        <div style={{ fontSize: 9, marginTop: 2 }}>
          Representación impresa de la Boleta de Venta Electrónica.
        </div>
        <div style={{ fontSize: 9 }}>
          Consulte su comprobante en SUNAT / InventiX
        </div>
        <div className="thermal-cut-guide">- - - - - - CORTE AQUÍ - - - - - -</div>
      </div>
    </div>
  );
}
