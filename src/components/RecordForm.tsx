import { useState, useEffect, type FormEvent } from "react";
import { Field } from "./UI";
import {
  catalogApi,
  inventoryApi,
  organizationApi,
  salesApi,
  suppliersApi,
  iamApi,
} from "../api/services";
import type {
  Almacen,
  Categoria,
  IamRole,
  Lote,
  MetodoPago,
  Producto,
  Proveedor,
  Sucursal,
  UnidadMedida,
} from "../api/types";

export type FormKind =
  | "product"
  | "supplier"
  | "warehouse"
  | "user"
  | "movement"
  | "sale";

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Catalog metadata
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [units, setUnits] = useState<UnidadMedida[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [warehouses, setWarehouses] = useState<Almacen[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [suppliers, setSuppliers] = useState<Proveedor[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<MetodoPago[]>([]);
  const [lots, setLots] = useState<Lote[]>([]);
  const [roles, setRoles] = useState<IamRole[]>([]);

  // Selected values
  const [movementType, setMovementType] = useState<string>(
    initialType || (kind === "sale" ? "SALIDA_VENTA" : "ENTRADA_COMPRA"),
  );
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [categoriesResult, unitsResult, productsResult, warehousesResult, branchesResult, suppliersResult, paymentMethodsResult, lotsResult, rolesResult] =
          await Promise.allSettled([
            catalogApi.getCategorias(),
            catalogApi.getUnidadesMedida(),
            catalogApi.getProductos(),
            organizationApi.getAlmacenes(),
            organizationApi.getSucursales(),
            suppliersApi.getProveedores(),
            salesApi.getMetodosPago(),
            catalogApi.getLotes(),
            iamApi.getRoles(),
          ]);

        if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value);
        if (unitsResult.status === "fulfilled") setUnits(unitsResult.value);
        if (productsResult.status === "fulfilled") {
          setProducts(productsResult.value);
          if (productsResult.value.length > 0) setSelectedProduct(productsResult.value[0].id);
        }
        if (warehousesResult.status === "fulfilled") {
          setWarehouses(warehousesResult.value);
          if (warehousesResult.value.length > 0) setSelectedWarehouse(warehousesResult.value[0].id);
        }
        if (branchesResult.status === "fulfilled") setSucursales(branchesResult.value);
        if (suppliersResult.status === "fulfilled") setSuppliers(suppliersResult.value);
        if (paymentMethodsResult.status === "fulfilled") {
          setPaymentMethods(paymentMethodsResult.value);
          if (paymentMethodsResult.value.length > 0) setSelectedPaymentMethod(paymentMethodsResult.value[0].id);
        }
        if (lotsResult.status === "fulfilled") setLots(lotsResult.value);
        if (rolesResult.status === "fulfilled") setRoles(rolesResult.value);
      } catch (err) {
        console.warn("Error loading form metadata:", err);
      }
    }
    loadMetadata();
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const getText = (fieldName: string) => String(formData.get(fieldName) || "").trim();
    const getNumber = (fieldName: string) => Number(getText(fieldName));

    try {
      if (kind === "product") {
        const categoryId = getText("categoriaId") || categories[0]?.id;
        const unitId = getText("unidadMedidaId") || units[0]?.id;

        if (!categoryId || !unitId) {
          throw new Error(
            "Primero debes tener al menos una categoría y unidad de medida",
          );
        }

        if (edit) {
          await catalogApi.updateProducto(edit.id, {
            sku: getText("sku"),
            codigoBarras: getText("codigoBarras") || undefined,
            nombre: getText("nombre"),
            descripcion: getText("descripcion") || undefined,
            precioVentaBase: getNumber("precioVenta"),
            manejaLotes: getText("manejaLotes") === "on",
            categoriaId: categoryId,
            unidadMedidaId: unitId,
          });
          notify("Producto actualizado exitosamente");
        } else {
          await catalogApi.createProducto({
            sku: getText("sku"),
            codigoBarras: getText("codigoBarras") || undefined,
            nombre: getText("nombre"),
            descripcion: getText("descripcion") || undefined,
            precioVentaBase: getNumber("precioVenta"),
            costoPromedio: getNumber("costoPromedio"),
            manejaLotes: getText("manejaLotes") === "on",
            categoriaId: categoryId,
            unidadMedidaId: unitId,
          });
          notify("Nuevo producto guardado en el catálogo");
        }
      } else if (kind === "supplier") {
        if (!/^\d{11}$/.test(getText("ruc"))) {
          throw new Error("El RUC debe tener exactamente 11 dígitos.");
        }
        await suppliersApi.createProveedor({
          razonSocial: getText("razonSocial"),
          ruc: getText("ruc"),
          correo: getText("correo") || undefined,
          telefono: getText("telefono") || undefined,
          leadTimePromedioDias: getNumber("leadTimePromedioDias"),
        });
        notify("Proveedor registrado con éxito");
      } else if (kind === "warehouse") {
        const sucursalId = getText("sucursalId") || sucursales[0]?.id;
        if (!sucursalId) {
          throw new Error("No se encontró sucursal activa");
        }
        await organizationApi.createAlmacen({
          sucursalId,
          nombre: getText("nombre"),
          tipo: getText("tipo") as Almacen["tipo"],
          descripcion: getText("descripcion") || undefined,
        });
        notify("Almacén creado exitosamente");
      } else if (kind === "user") {
        const rolId = getText("rolId") || roles[0]?.id;
        if (!rolId) throw new Error("No hay roles disponibles para asignar");
        await iamApi.createUsuario({
          nombre: getText("nombre"),
          correo: getText("correo").toLowerCase(),
          password: getText("password"),
          rolId,
        });
        notify("Usuario del equipo registrado");
      } else if (kind === "movement") {
        const quantity = getNumber("cantidad");
        if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0");

        const product = products.find((item) => item.id === selectedProduct);
        const warehouse = warehouses.find((item) => item.id === selectedWarehouse);
        if (!product) throw new Error("Selecciona un producto válido");
        if (!warehouse) throw new Error("Selecciona un almacén válido");

        const isEntrada = movementType === "ENTRADA_COMPRA";
        const isTransfer = movementType === "TRASLADO_INTERNO";
        const isAdjustment = movementType === "AJUSTE_INVENTARIO";
        const adjustmentEntry = getText("ajusteDireccion") !== "SALIDA";
        const usesOrigin =
          isTransfer ||
          movementType === "SALIDA_VENTA" ||
          movementType === "SALIDA_MERMA" ||
          (isAdjustment && !adjustmentEntry);
        const usesDestination = isEntrada || isTransfer || (isAdjustment && adjustmentEntry);

        let loteId: string | undefined;
        if (product.manejaLotes) {
          if (isEntrada) {
            const codigoLote = getText("codigoLote");
            const fechaVencimiento = getText("fechaVencimiento");
            if (!codigoLote || !fechaVencimiento) {
              throw new Error("El producto requiere número de lote y fecha de vencimiento");
            }
            const createdLot = await catalogApi.createLote({
              productoId: product.id,
              codigoLote,
              fechaVencimiento,
            });
            loteId = createdLot.id;
          } else {
            loteId = getText("loteId");
            if (!loteId) throw new Error("Selecciona el lote que se afectará");
          }
        }

        await inventoryApi.createMovimiento({
          tipo: movementType as Parameters<typeof inventoryApi.createMovimiento>[0]["tipo"],
          sucursalId: warehouse.sucursalId,
          motivo: getText("motivo"),
          almacenOrigenId: usesOrigin ? selectedWarehouse : undefined,
          almacenDestinoId: isTransfer
            ? getText("almacenDestinoId")
            : usesDestination
              ? selectedWarehouse
              : undefined,
          proveedorId: isEntrada ? getText("proveedorId") || undefined : undefined,
          completarInmediato: getText("autoComplete") === "on",
          detalles: [
            {
              productoId: selectedProduct,
              cantidad: quantity,
              costoUnitario: getNumber("costoUnitario") || undefined,
              loteId,
            },
          ],
        });

        if (getText("autoComplete") === "on") {
          notify("Movimiento registrado y aplicado al Kardex");
        } else {
          notify("Movimiento guardado como borrador");
        }
      } else if (kind === "sale") {
        const quantity = getNumber("cantidad");
        const selectedProductRecord = products.find((product) => product.id === selectedProduct);
        const unitPrice = getNumber("precioUnitario") || selectedProductRecord?.precioVenta;
        if (!unitPrice || unitPrice <= 0) throw new Error("Ingresa un precio de venta válido");
        const totalAmount = quantity * unitPrice;
        const selectedProductLot = getText("loteIdVenta") || undefined;
        if (selectedProductRecord?.manejaLotes && !selectedProductLot) {
          throw new Error("Selecciona un lote disponible para la venta");
        }
        if (!selectedWarehouse) throw new Error("Selecciona un almacén de despacho");
        if (!selectedPaymentMethod && !paymentMethods[0]?.id) {
          throw new Error("No hay métodos de pago disponibles");
        }

        await salesApi.createVenta({
          almacenDespachoId: selectedWarehouse,
          numeroComprobante: getText("numeroComprobante") || undefined,
          detalles: [
            {
              productoId: selectedProduct,
              cantidad: quantity,
              precioUnitario: unitPrice,
              loteId: selectedProductLot,
            },
          ],
          pagos: [
            {
              metodoPagoId:
                selectedPaymentMethod || paymentMethods[0]?.id || "",
              monto: totalAmount,
              referencia: getText("referenciaPago") || undefined,
            },
          ],
        });
        notify("Venta registrada y existencias descontadas según FEFO");
      }

      onSuccess();
      close();
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  }

  const selectedProductData = products.find((p) => p.id === selectedProduct);
  const selectableLots = lots.filter(
    (lot) =>
      lot.productoId === selectedProduct &&
      lot.cantidadDisponible > 0 &&
      (!selectedWarehouse || !lot.almacen || lot.almacen.id === selectedWarehouse) &&
      !["VENCIDO", "CUARENTENA", "AGOTADO"].includes(lot.estado),
  );

  return (
    <form onSubmit={submit} className="record-form">
      {kind === "product" && (
        <>
          <div className="form-grid">
            <Field label="Código SKU">
              <input
                name="sku"
                required
                defaultValue={edit?.sku}
                maxLength={40}
                placeholder="Ej. LAC-001"
              />
            </Field>
            <Field label="Código de Barras (opcional)">
              <input
                name="codigoBarras"
                defaultValue={edit?.codigoBarras}
                maxLength={50}
                placeholder="77501234..."
              />
            </Field>
            <Field label="Nombre del Producto">
              <input
                name="nombre"
                required
                defaultValue={edit?.nombre}
                maxLength={120}
                placeholder="Leche Gloria 400g"
              />
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
              <input
                name="precioVenta"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={edit?.precioVenta}
              />
            </Field>
            {!edit && (
              <Field label="Costo Promedio Inicial (S/)">
                <input
                  name="costoPromedio"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                />
              </Field>
            )}
            <Field label="Control de lotes">
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  name="manejaLotes"
                  type="checkbox"
                  defaultChecked={edit?.manejaLotes}
                />
                <span>El producto requiere lote y vencimiento</span>
              </label>
            </Field>
          </div>
          <Field label="Descripción / Especificaciones">
            <input
              name="descripcion"
              defaultValue={edit?.descripcion}
              placeholder="Detalle adicional del producto"
            />
          </Field>
        </>
      )}

      {kind === "supplier" && (
        <div className="form-grid">
          <Field label="Razón Social / Nombre Comercial">
            <input
              name="razonSocial"
              required
              maxLength={150}
              placeholder="Distribuidora Lima S.A.C."
            />
          </Field>
          <Field label="RUC (11 dígitos)">
            <input
              name="ruc"
              required
              pattern="[0-9]{11}"
              maxLength={11}
              placeholder="20100456789"
            />
          </Field>
          <Field label="Correo Electrónico">
            <input
              name="correo"
              type="email"
              placeholder="ventas@proveedor.pe"
            />
          </Field>
          <Field label="Teléfono de Contacto">
            <input name="telefono" type="tel" placeholder="014238899" />
          </Field>
          <Field label="Tiempo de Entrega / Lead Time (días)">
            <input
              name="leadTimePromedioDias"
              type="number"
              min="1"
              step="1"
              required
            />
          </Field>
        </div>
      )}

      {kind === "warehouse" && (
        <div className="form-grid">
          <Field label="Nombre del Almacén">
            <input
              name="nombre"
              required
              maxLength={80}
              placeholder="Ej. Almacén Seco N° 2"
            />
          </Field>
          <Field label="Sucursal">
            <select name="sucursalId" required defaultValue={sucursales[0]?.id}>
              {sucursales.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nombre}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de Almacén">
            <select name="tipo" defaultValue="RECEPCION">
              <option value="PRINCIPAL">PRINCIPAL (Distribución)</option>
              <option value="EXPOSICION">EXPOSICIÓN (Ventas / Mostrador)</option>
              <option value="RECEPCION">RECEPCIÓN (Ingreso de mercadería)</option>
              <option value="MERMAS_CUARENTENA">
                MERMAS / CUARENTENA (Aislado)
              </option>
            </select>
          </Field>
          <Field label="Descripción (opcional)">
            <input name="descripcion" maxLength={255} placeholder="Uso del almacén" />
          </Field>
        </div>
      )}

      {kind === "user" && (
        <div className="form-grid">
          <Field label="Nombre Completo">
            <input name="nombre" required placeholder="Lucía Vargas" />
          </Field>
          <Field label="Correo Electrónico">
            <input
              name="correo"
              required
              type="email"
              placeholder="lucia@inventix.pe"
            />
          </Field>
          <Field label="Contraseña Temporal">
            <input
              name="password"
              required
              minLength={6}
              type="password"
            />
          </Field>
          <Field label="Rol Asignado">
            <select name="rolId" required defaultValue={roles[0]?.id}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {kind === "movement" && (
        <>
          <div className="form-grid">
            <Field label="Tipo de Operación">
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
              >
                <option value="ENTRADA_COMPRA">
                  Entrada por Compra (Ingreso de lote)
                </option>
                <option value="SALIDA_VENTA">Salida de Inventario</option>
                <option value="TRASLADO_INTERNO">
                  Transferencia entre Almacenes
                </option>
                <option value="SALIDA_MERMA">
                  Merma / Pérdida por Vencimiento
                </option>
                <option value="AJUSTE_INVENTARIO">Ajuste de Inventario</option>
              </select>
            </Field>

            <Field label="Producto">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={
                movementType === "TRASLADO_INTERNO"
                  ? "Almacén de Origen"
                  : "Almacén"
              }
            >
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre} ({w.tipo})
                  </option>
                ))}
              </select>
            </Field>

            {movementType === "TRASLADO_INTERNO" && (
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

            {movementType === "AJUSTE_INVENTARIO" && (
              <Field label="Dirección del ajuste">
                <select name="ajusteDireccion" defaultValue="ENTRADA">
                  <option value="ENTRADA">Aumentar existencias</option>
                  <option value="SALIDA">Disminuir existencias</option>
                </select>
              </Field>
            )}

            <Field label="Cantidad">
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                required
              />
            </Field>

            {movementType === "ENTRADA_COMPRA" && (
              <>
                <Field label="Proveedor (opcional)">
                  <select name="proveedorId" defaultValue="">
                    <option value="">Sin proveedor</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Costo Unitario de Compra (S/)">
                  <input
                    name="costoUnitario"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    defaultValue={selectedProductData?.costoPromedio || undefined}
                  />
                </Field>
                {selectedProductData?.manejaLotes && (
                  <>
                    <Field label="Número de Lote">
                      <input name="codigoLote" required placeholder="LOT-2026-X" />
                    </Field>
                    <Field label="Fecha de Vencimiento">
                      <input name="fechaVencimiento" type="date" required />
                    </Field>
                  </>
                )}
              </>
            )}

            {movementType !== "ENTRADA_COMPRA" && selectedProductData?.manejaLotes && (
              <Field label="Lote a afectar">
                <select name="loteId" required defaultValue="">
                  <option value="">Selecciona un lote</option>
                  {selectableLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.numeroLote} · {lot.cantidadDisponible} disponibles
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          <Field label="Motivo / Referencia">
            <input
              name="motivo"
              required
              placeholder="Ej. Factura de compra F001-124, merma por rotura, o traslado"
            />
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              marginTop: 10,
            }}
          >
            <input type="checkbox" name="autoComplete" defaultChecked />
            <span>
              Aprobar y completar inmediatamente (impacta existencias y Kardex)
            </span>
          </label>
        </>
      )}

      {kind === "sale" && (
        <>
          <div className="form-grid">
            <Field label="Producto a Vender">
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.nombre} (P.Venta: S/ {p.precioVenta})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Almacén de Despacho">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Cantidad">
              <input
                name="cantidad"
                type="number"
                min="1"
                step="1"
                required
              />
            </Field>

            <Field label="Precio Unitario (S/)">
              <input
                name="precioUnitario"
                type="number"
                min="0.01"
                step="0.01"
                required
                defaultValue={selectedProductData?.precioVenta || undefined}
              />
            </Field>

            {selectedProductData?.manejaLotes && (
              <Field label="Lote">
                <select name="loteIdVenta" required defaultValue="">
                  <option value="">Selecciona un lote disponible</option>
                  {selectableLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.numeroLote} · {lot.cantidadDisponible} disponibles
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Método de Pago">
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>
                    {pm.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Número de Comprobante">
              <input name="numeroComprobante" maxLength={50} placeholder="Ej. B001-000001" />
            </Field>
          </div>

          <div className="fefo-note" style={{ marginTop: 12 }}>
            <strong>Control de lote y existencias</strong>
            <p>
              Para productos con lotes se debe seleccionar una existencia vigente
              del almacén antes de registrar la venta.
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
        <button
          type="button"
          className="secondary"
          onClick={close}
          disabled={loading}
        >
          Cancelar
        </button>
        <button className="primary" type="submit" disabled={loading}>
          {loading
            ? "Procesando..."
            : edit
              ? "Guardar Cambios"
              : "Confirmar y Guardar"}
        </button>
      </div>
    </form>
  );
}
