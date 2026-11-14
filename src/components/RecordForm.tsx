import { useState, useEffect, type FormEvent } from 'react';
import { Field } from './UI';
import {
  catalogApi,
  inventoryApi,
  organizationApi,
  salesApi,
  suppliersApi,
  iamApi,
} from '../api/services';
import type {
  Almacen,
  Categoria,
  MetodoPago,
  Producto,
  Proveedor,
  Sucursal,
  UnidadMedida,
} from '../api/types';

export type FormKind = 'product' | 'supplier' | 'warehouse' | 'user' | 'movement' | 'sale';

export function RecordForm({
  kind,
  edit,
  initialType,
  close,
  notify,
  onSuccess,
}: {
  kind: FormKind;
  edit?: Producto;
  initialType?: string;
  close: () => void;
  notify: (s: string) => void;
  onSuccess: () => void;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Catalog metadata
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [units, setUnits] = useState<UnidadMedida[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);

  // Selected values
  const [movementType, setMovementType] = useState<string>(
    initialType || (kind === 'sale' ? 'SALIDA_VENTA' : 'ENTRADA_COMPRA'),
  );
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [cats, uns, prods, alms, sucs, sups, pms] = await Promise.allSettled([
          catalogApi.getCategorias(),
          catalogApi.getUnidadesMedida(),
          catalogApi.getProductos(),
          organizationApi.getAlmacenes(),
          organizationApi.getSucursales(),
          suppliersApi.getProveedores(),
          salesApi.getMetodosPago(),
        ]);

        if (cats.status === 'fulfilled') setCategories(cats.value);
        if (uns.status === 'fulfilled') setUnits(uns.value);
        if (prods.status === 'fulfilled') {
          setProducts(prods.value);
          if (prods.value.length > 0) setSelectedProduct(prods.value[0].id);
        }
        if (alms.status === 'fulfilled') {
          setWarehouses(alms.value);
          if (alms.value.length > 0) setSelectedWarehouse(alms.value[0].id);
        }
        if (sucs.status === 'fulfilled') setSucursales(sucs.value);
        if (sups.status === 'fulfilled') setSuppliers(sups.value);
        if (pms.status === 'fulfilled') {
          setPaymentMethods(pms.value);
          if (pms.value.length > 0) setSelectedPaymentMethod(pms.value[0].id);
        }
      } catch (err) {
        console.warn('Error loading form metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const val = (k: string) => String(data.get(k) || '').trim();
    const num = (k: string) => Number(val(k));

    try {
      if (kind === 'product') {
        const catId = val('categoriaId') || categories[0]?.id;
        const unitId = val('unidadMedidaId') || units[0]?.id;

        if (!catId || !unitId) {
          throw new Error('Primero debes tener al menos una categoría y unidad de medida');
        }

        if (edit) {
          await catalogApi.updateProducto(edit.id, {
            sku: val('sku'),
            codigoBarras: val('codigoBarras') || undefined,
            nombre: val('nombre'),
            descripcion: val('descripcion') || undefined,
            precioVenta: num('precioVenta'),
            stockMinimo: num('stockMinimo'),
            categoriaId: catId,
            unidadMedidaId: unitId,
          });
          notify('Producto actualizado exitosamente');
        } else {
          await catalogApi.createProducto({
            sku: val('sku'),
            codigoBarras: val('codigoBarras') || undefined,
            nombre: val('nombre'),
            descripcion: val('descripcion') || undefined,
            precioVenta: num('precioVenta'),
            costoPromedio: num('costoPromedio'),
            stockMinimo: num('stockMinimo'),
            stockMaximo: num('stockMaximo') || undefined,
            puntoReorden: num('puntoReorden') || undefined,
            categoriaId: catId,
            unidadMedidaId: unitId,
          });
          notify('Nuevo producto guardado en el catálogo');
        }
      } else if (kind === 'supplier') {
        if (!/^\d{11}$/.test(val('ruc'))) {
          throw new Error('El RUC debe tener exactamente 11 dígitos.');
        }
        await suppliersApi.createProveedor({
          nombre: val('nombre'),
          razonSocial: val('razonSocial') || undefined,
          ruc: val('ruc'),
          correo: val('correo') || undefined,
          telefono: val('telefono') || undefined,
          leadTimeDias: num('leadTimeDias') || 3,
        });
        notify('Proveedor registrado con éxito');
      } else if (kind === 'warehouse') {
        const sucursalId = val('sucursalId') || sucursales[0]?.id;
        if (!sucursalId) {
          throw new Error('No se encontró sucursal activa');
        }
        await organizationApi.createAlmacen({
          sucursalId,
          nombre: val('nombre'),
          codigo: val('codigo') || `ALM-${Math.floor(100 + Math.random() * 900)}`,
          tipo: val('tipo') as any,
        });
        notify('Almacén creado exitosamente');
      } else if (kind === 'user') {
        await iamApi.createUsuario({
          nombre: val('nombre'),
          correo: val('correo').toLowerCase(),
          password: val('password') || 'Inventix123!',
          rol: val('rol'),
        });
        notify('Usuario del equipo registrado');
      } else if (kind === 'movement') {
        const qty = num('cantidad');
        if (qty <= 0) throw new Error('La cantidad debe ser mayor a 0');

        const isEntrada = movementType === 'ENTRADA_COMPRA';
        const isTransfer = movementType === 'TRANSFERENCIA';

        const mov = await inventoryApi.createMovimiento({
          tipo: movementType,
          motivo: val('motivo') || 'Operación manual de almacén',
          almacenOrigenId: isEntrada ? undefined : selectedWarehouse,
          almacenDestinoId: isTransfer ? val('almacenDestinoId') : selectedWarehouse,
          detalles: [
            {
              productoId: selectedProduct,
              cantidad: qty,
              costoUnitario: num('costoUnitario') || undefined,
              numeroLote: val('numeroLote') || undefined,
              fechaVencimiento: val('fechaVencimiento') || undefined,
            },
          ],
        });

        // Automatically approve and complete if checked
        if (val('autoComplete') === 'on') {
          await inventoryApi.aprobarMovimiento(mov.id);
          await inventoryApi.completarMovimiento(mov.id);
          notify('Movimiento registrado y aplicado al Kardex');
        } else {
          notify('Movimiento guardado como borrador');
        }
      } else if (kind === 'sale') {
        const qty = num('cantidad');
        const prod = products.find((p) => p.id === selectedProduct);
        const unitPrice = num('precioUnitario') || prod?.precioVenta || 10;
        const totalAmount = qty * unitPrice;

        await salesApi.createVenta({
          almacenId: selectedWarehouse,
          tipoComprobante: val('tipoComprobante') || 'BOLETA',
          numeroComprobante: `B001-${Math.floor(100000 + Math.random() * 900000)}`,
          clienteNombre: val('clienteNombre') || 'Cliente Mostrador',
          clienteDocumento: val('clienteDocumento') || undefined,
          detalles: [
            {
              productoId: selectedProduct,
              cantidad: qty,
              precioUnitario: unitPrice,
            },
          ],
          pagos: [
            {
              metodoPagoId: selectedPaymentMethod || paymentMethods[0]?.id || '',
              monto: totalAmount,
              referencia: val('referenciaPago') || undefined,
            },
          ],
        });
        notify('Venta registrada y existencias descontadas según FEFO');
      }

      onSuccess();
      close();
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  return (
    <form onSubmit={submit} className="record-form">
      {kind === 'product' && (
        <>
          <div className="form-grid">
            <Field label="Código SKU">
              <input name="sku" required defaultValue={edit?.sku} maxLength={40} placeholder="Ej. LAC-001" />
            </Field>
            <Field label="Código de Barras (opcional)">
              <input name="codigoBarras" defaultValue={edit?.codigoBarras} maxLength={50} placeholder="77501234..." />
            </Field>
            <Field label="Nombre del Producto">
              <input name="nombre" required defaultValue={edit?.nombre} maxLength={120} placeholder="Leche Gloria 400g" />
            </Field>
            <Field label="Categoría">
              <select name="categoriaId" defaultValue={edit?.categoriaId}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unidad de Medida">
              <select name="unidadMedidaId" defaultValue={edit?.unidadMedidaId}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.simbolo})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Precio de Venta (S/)">
              <input name="precioVenta" type="number" min="0.01" step="0.01" required defaultValue={edit?.precioVenta || 5.0} />
            </Field>
            {!edit && (
              <Field label="Costo Promedio Inicial (S/)">
                <input name="costoPromedio" type="number" min="0" step="0.01" required defaultValue={3.5} />
              </Field>
            )}
            <Field label="Stock Mínimo (Alerta)">
              <input name="stockMinimo" type="number" min="0" step="1" required defaultValue={edit?.stockMinimo ?? 12} />
            </Field>
            <Field label="Punto de Reorden (ROP)">
              <input name="puntoReorden" type="number" min="0" step="1" defaultValue={edit?.puntoReorden ?? 24} />
            </Field>
          </div>
          <Field label="Descripción / Especificaciones">
            <input name="descripcion" defaultValue={edit?.descripcion} placeholder="Detalle adicional del producto" />
          </Field>
        </>
      )}

      {kind === 'supplier' && (
        <div className="form-grid">
          <Field label="Razón Social / Nombre Comercial">
            <input name="nombre" required maxLength={120} placeholder="Distribuidora Lima S.A.C." />
          </Field>
          <Field label="RUC (11 dígitos)">
            <input name="ruc" required pattern="[0-9]{11}" maxLength={11} placeholder="20100456789" />
          </Field>
          <Field label="Correo Electrónico">
            <input name="correo" type="email" placeholder="ventas@proveedor.pe" />
          </Field>
          <Field label="Teléfono de Contacto">
            <input name="telefono" type="tel" placeholder="014238899" />
          </Field>
          <Field label="Tiempo de Entrega / Lead Time (días)">
            <input name="leadTimeDias" type="number" min="1" step="1" required defaultValue="3" />
          </Field>
        </div>
      )}

      {kind === 'warehouse' && (
        <div className="form-grid">
          <Field label="Nombre del Almacén">
            <input name="nombre" required maxLength={80} placeholder="Ej. Almacén Seco N° 2" />
          </Field>
          <Field label="Código Interno">
            <input name="codigo" required maxLength={20} placeholder="Ej. ALM-03" />
          </Field>
          <Field label="Tipo de Almacén">
            <select name="tipo" defaultValue="PULMON">
              <option value="PRINCIPAL">PRINCIPAL (Distribución)</option>
              <option value="PULMON">PULMÓN (Ventas / Mostrador)</option>
              <option value="MERMAS_CUARENTENA">MERMAS / CUARENTENA (Aislado)</option>
            </select>
          </Field>
        </div>
      )}

      {kind === 'user' && (
        <div className="form-grid">
          <Field label="Nombre Completo">
            <input name="nombre" required placeholder="Lucía Vargas" />
          </Field>
          <Field label="Correo Electrónico">
            <input name="correo" required type="email" placeholder="lucia@inventix.pe" />
          </Field>
          <Field label="Contraseña Temporal">
            <input name="password" required minLength={6} defaultValue="Inventix123!" />
          </Field>
          <Field label="Rol Asignado">
            <select name="rol" defaultValue="OPERADOR_ALMACEN">
              <option value="ADMIN">ADMIN (Acceso total)</option>
              <option value="SUPERVISOR_ALMACEN">SUPERVISOR_ALMACEN (Aprueba kardex)</option>
              <option value="OPERADOR_ALMACEN">OPERADOR_ALMACEN (Registra entradas/salidas)</option>
              <option value="CAJERO">CAJERO (Solo ventas)</option>
            </select>
          </Field>
        </div>
      )}

      {kind === 'movement' && (
        <>
          <div className="form-grid">
            <Field label="Tipo de Operación">
              <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
                <option value="ENTRADA_COMPRA">Entrada por Compra (Ingreso de lote)</option>
                <option value="SALIDA_VENTA">Salida de Inventario</option>
                <option value="TRANSFERENCIA">Transferencia entre Almacenes</option>
                <option value="MERMA_VENCIMIENTO">Merma / Pérdida por Vencimiento</option>
                <option value="AJUSTE_POSITIVO">Ajuste Positivo (+)</option>
                <option value="AJUSTE_NEGATIVO">Ajuste Negativo (-)</option>
              </select>
            </Field>

            <Field label="Producto">
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={movementType === 'TRANSFERENCIA' ? 'Almacén de Origen' : 'Almacén'}>
              <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre} ({w.tipo})
                  </option>
                ))}
              </select>
            </Field>

            {movementType === 'TRANSFERENCIA' && (
              <Field label="Almacén de Destino">
                <select name="almacenDestinoId" required>
                  <option value="">Selecciona destino</option>
                  {warehouses
                    .filter((w) => w.id !== selectedWarehouse)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nombre}
                      </option>
                    ))}
                </select>
              </Field>
            )}

            <Field label="Cantidad">
              <input name="cantidad" type="number" min="1" step="1" required defaultValue="10" />
            </Field>

            {movementType === 'ENTRADA_COMPRA' && (
              <>
                <Field label="Costo Unitario de Compra (S/)">
                  <input
                    name="costoUnitario"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={selectedProductData?.costoPromedio || 3.5}
                  />
                </Field>
                <Field label="Número de Lote">
                  <input name="numeroLote" required placeholder="LOT-2026-X" defaultValue={`LOT-${Math.floor(1000 + Math.random() * 9000)}`} />
                </Field>
                <Field label="Fecha de Vencimiento">
                  <input
                    name="fechaVencimiento"
                    type="date"
                    required
                    defaultValue={
                      new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0]
                    }
                  />
                </Field>
              </>
            )}
          </div>

          <Field label="Motivo / Referencia">
            <input
              name="motivo"
              required
              placeholder="Ej. Factura de compra F001-124, merma por rotura, o traslado"
              defaultValue="Operación manual regular"
            />
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginTop: 10 }}>
            <input type="checkbox" name="autoComplete" defaultChecked />
            <span>Aprobar y completar inmediatamente (impacta existencias y Kardex)</span>
          </label>
        </>
      )}

      {kind === 'sale' && (
        <>
          <div className="form-grid">
            <Field label="Producto a Vender">
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre} (P.Venta: S/ {p.precioVenta})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Almacén de Despacho">
              <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cantidad">
              <input name="cantidad" type="number" min="1" step="1" required defaultValue="1" />
            </Field>

            <Field label="Precio Unitario (S/)">
              <input
                name="precioUnitario"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={selectedProductData?.precioVenta || 5.0}
              />
            </Field>

            <Field label="Método de Pago">
              <select value={selectedPaymentMethod} onChange={(e) => setSelectedPaymentMethod(e.target.value)}>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de Comprobante">
              <select name="tipoComprobante" defaultValue="BOLETA">
                <option value="BOLETA">Boleta de Venta</option>
                <option value="FACTURA">Factura Electrónica</option>
                <option value="TICKET">Ticket de Caja</option>
              </select>
            </Field>

            <Field label="Nombre del Cliente">
              <input name="clienteNombre" placeholder="Público General" defaultValue="Cliente Mostrador" />
            </Field>

            <Field label="DNI / RUC del Cliente (opcional)">
              <input name="clienteDocumento" placeholder="8 o 11 dígitos" />
            </Field>
          </div>

          <div className="fefo-note" style={{ marginTop: 12 }}>
            <strong>Deducción FEFO Automática</strong>
            <p>
              El backend consumirá automáticamente el lote activo más próximo a vencer de este almacén, evitando productos caducados.
            </p>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="form-error" style={{ marginTop: 14 }}>
          {error}
        </p>
      )}

      <div className="form-actions" style={{ marginTop: 20 }}>
        <button type="button" className="secondary" onClick={close} disabled={loading}>
          Cancelar
        </button>
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Procesando...' : edit ? 'Guardar Cambios' : 'Confirmar y Guardar'}
        </button>
      </div>
    </form>
  );
}
