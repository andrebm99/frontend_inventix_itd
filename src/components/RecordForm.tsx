import { useState, useEffect, useMemo, type FormEvent } from "react";
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Field } from "./UI";
import { SearchableProductSelect } from "./SearchableProductSelect";
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
  MetodoPago,
  Producto,
  Proveedor,
  Sucursal,
  UnidadMedida,
  StockAlmacen,
} from "../api/types";

export type FormKind =
  | "product"
  | "supplier"
  | "warehouse"
  | "user"
  | "movement"
  | "sale";

interface CartItem {
  productoId: string;
  producto: Producto;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface MovementLineItem {
  productoId: string;
  producto?: Producto;
  cantidad: number;
  costoUnitario?: number;
  numeroLote?: string;
  fechaVencimiento?: string;
}

export function RecordForm({
  kind,
  edit,
  initialType,
  close,
  notify,
  onSuccess,
}: {
  kind: FormKind;
  edit?: any;
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
  const [roles, setRoles] = useState<IamRole[]>([]);

  // Selected values
  const [movementType, setMovementType] = useState<string>(
    initialType || (kind === "sale" ? "SALIDA_VENTA" : "ENTRADA_COMPRA"),
  );
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");

  // Movement multiple items state & warehouse selections
  const [stockList, setStockList] = useState<StockAlmacen[]>([]);
  const [movementOriginWarehouse, setMovementOriginWarehouse] = useState<string>("");
  const [movementDestWarehouse, setMovementDestWarehouse] = useState<string>("");
  const [movementSupplierId, setMovementSupplierId] = useState<string>("");
  const [movementLines, setMovementLines] = useState<MovementLineItem[]>([]);
  const [addCost, setAddCost] = useState<string>("");
  const [addLote, setAddLote] = useState<string>("");
  const [addFechaVenc, setAddFechaVenc] = useState<string>("");

  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [tipoComprobante, setTipoComprobante] = useState<string>("BOLETA");
  const [montoRecibido, setMontoRecibido] = useState<string>("");

  // Autogenerate unique SKU for new products or retain immutable SKU on edit
  const autoSku = useMemo(() => {
    if (edit?.sku) return edit.sku;
    const prdNumbers = products
      .map((p) => {
        const match = (p.sku || "").match(/^PRD-(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);
    const maxNum = prdNumbers.length > 0 ? Math.max(...prdNumbers) : products.length;
    return `PRD-${String(maxNum + 1).padStart(4, "0")}`;
  }, [edit, products]);

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) return;

    const qty = Number(addQuantity) > 0 ? Number(addQuantity) : 1;
    const unitPrice = Number(prod.precioVenta) || 0;

    setCart((prev) => {
      const idx = prev.findIndex((i) => i.productoId === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nextQty = copy[idx].cantidad + qty;
        copy[idx] = {
          ...copy[idx],
          cantidad: nextQty,
          subtotal: Number((nextQty * unitPrice).toFixed(2)),
        };
        return copy;
      }
      return [
        ...prev,
        {
          productoId: prod.id,
          producto: prod,
          cantidad: qty,
          precioUnitario: unitPrice,
          subtotal: Number((qty * unitPrice).toFixed(2)),
        },
      ];
    });
    setAddQuantity(1);
  };

  const handleUpdateQty = (productoId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productoId === productoId) {
            const nextQty = item.cantidad + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              cantidad: nextQty,
              subtotal: Number((nextQty * item.precioUnitario).toFixed(2)),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  const handleRemoveFromCart = (productoId: string) => {
    setCart((prev) => prev.filter((item) => item.productoId !== productoId));
  };

  const cartTotal = Number(
    cart.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2),
  );
  const vuelto =
    Number(montoRecibido) > cartTotal
      ? Number((Number(montoRecibido) - cartTotal).toFixed(2))
      : 0;

  // Stock in warehouse calculator
  const getStockInWarehouse = (prodId: string, whId: string) => {
    if (!prodId || !whId) return 0;
    return stockList
      .filter(
        (s) =>
          (s.almacenId === whId || (s as any).almacen_id === whId) &&
          (s.productoId === prodId || (s as any).producto_id === prodId),
      )
      .reduce((acc, curr) => acc + Number(curr.cantidad ?? (curr as any).cantidad_actual ?? 0), 0);
  };

  const handleAddMovementLine = () => {
    if (!selectedProduct) {
      setError("Selecciona un producto para agregarlo al movimiento");
      return;
    }
    const prod = products.find((p) => p.id === selectedProduct);
    if (!prod) return;

    const qty = Number(addQuantity) > 0 ? Number(addQuantity) : 1;

    const isExitOp =
      movementType === "TRASLADO_INTERNO" ||
      movementType === "TRANSFERENCIA" ||
      movementType === "SALIDA_VENTA" ||
      movementType === "SALIDA_MERMA";

    if (isExitOp && movementOriginWarehouse) {
      const available = getStockInWarehouse(prod.id, movementOriginWarehouse);
      const alreadyInList = movementLines
        .filter((l) => l.productoId === prod.id)
        .reduce((sum, l) => sum + l.cantidad, 0);

      if (alreadyInList + qty > available) {
        setError(
          `Stock insuficiente para "${prod.nombre}" en el almacén de origen. Disponible: ${available} uds (ya en lista: ${alreadyInList} uds).`,
        );
        return;
      }
    }

    setError("");
    setMovementLines((prev) => [
      ...prev,
      {
        productoId: prod.id,
        producto: prod,
        cantidad: qty,
        costoUnitario: addCost ? Number(addCost) : Number(prod.costoPromedio || 0),
        numeroLote: addLote.trim() || undefined,
        fechaVencimiento: addFechaVenc || undefined,
      },
    ]);

    setAddQuantity(1);
    setAddCost("");
    setAddLote("");
    setAddFechaVenc("");
  };

  const handleRemoveMovementLine = (index: number) => {
    setMovementLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [
          categoriesResult,
          unitsResult,
          productsResult,
          warehousesResult,
          branchesResult,
          suppliersResult,
          paymentMethodsResult,
          stockResult,
        ] = await Promise.allSettled([
          catalogApi.getCategorias(),
          catalogApi.getUnidadesMedida(),
          catalogApi.getProductos(),
          organizationApi.getAlmacenes(),
          organizationApi.getSucursales(),
          suppliersApi.getProveedores(),
          salesApi.getMetodosPago(),
          inventoryApi.getStock(),
        ]);

        if (categoriesResult.status === "fulfilled") setCategories(categoriesResult.value);
        if (unitsResult.status === "fulfilled") setUnits(unitsResult.value);
        if (stockResult.status === "fulfilled") setStockList(stockResult.value);

        if (warehousesResult.status === "fulfilled") {
          const whs = warehousesResult.value;
          setWarehouses(whs);
          if (edit && kind === "movement") {
            const origId = edit.almacenOrigenId || edit.almacenOrigen?.id;
            const destId = edit.almacenDestinoId || edit.almacenDestino?.id;
            if (origId) setMovementOriginWarehouse(origId);
            else if (whs.length > 0) setMovementOriginWarehouse(whs[0].id);

            if (destId) setMovementDestWarehouse(destId);
            else if (whs.length > 1) setMovementDestWarehouse(whs[1].id);
            else if (whs.length > 0) setMovementDestWarehouse(whs[0].id);
          } else if (whs.length > 0) {
            setMovementOriginWarehouse(whs[0].id);
            setMovementDestWarehouse(whs.length > 1 ? whs[1].id : whs[0].id);
            setSelectedWarehouse(whs[0].id);
          }
        }

        if (productsResult.status === "fulfilled") {
          const prods = productsResult.value;
          setProducts(prods);
          if (prods.length > 0 && !selectedProduct) {
            setSelectedProduct(prods[0].id);
          }
          if (edit && kind === "movement") {
            const rawDetails = edit.detalles || edit.detalle_movimiento || [];
            if (rawDetails.length > 0) {
              setMovementLines(
                rawDetails.map((d: any) => ({
                  productoId: d.productoId || d.producto_id,
                  producto:
                    d.producto ||
                    prods.find((p) => p.id === (d.productoId || d.producto_id)),
                  cantidad: Number(d.cantidad || 1),
                  costoUnitario:
                    d.costoUnitario !== undefined
                      ? Number(d.costoUnitario)
                      : d.costo_unitario !== undefined
                        ? Number(d.costo_unitario)
                        : undefined,
                  numeroLote:
                    d.numeroLote ||
                    d.codigoLote ||
                    d.producto_lote?.codigo_lote ||
                    undefined,
                  fechaVencimiento:
                    d.fechaVencimiento ||
                    (d.producto_lote?.fecha_vencimiento
                      ? String(d.producto_lote.fecha_vencimiento).split("T")[0]
                      : undefined),
                }))
              );
            }
          }
        }

        if (branchesResult.status === "fulfilled") setSucursales(branchesResult.value);
        if (suppliersResult.status === "fulfilled") {
          setSuppliers(suppliersResult.value);
          if (edit && kind === "movement") {
            const provId = edit.proveedorId || edit.proveedor_id || edit.proveedor?.id;
            if (provId) setMovementSupplierId(provId);
          }
        }
        if (paymentMethodsResult.status === "fulfilled") {
          setPaymentMethods(paymentMethodsResult.value);
          if (paymentMethodsResult.value.length > 0) setSelectedPaymentMethod(paymentMethodsResult.value[0].id);
        }
        iamApi.getRoles().then(setRoles).catch(() => []);
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
            sku: getText("sku") || autoSku,
            codigoBarras: getText("codigoBarras") || undefined,
            nombre: getText("nombre"),
            descripcion: getText("descripcion") || undefined,
            precioVenta: getNumber("precioVenta"),
            stockMinimo: getNumber("stockMinimo"),
            puntoReorden: getNumber("puntoReorden") || undefined,
            categoriaId: categoryId,
            unidadMedidaId: unitId,
          });
          notify("Producto actualizado exitosamente");
        } else {
          await catalogApi.createProducto({
            sku: getText("sku") || autoSku,
            codigoBarras: getText("codigoBarras") || undefined,
            nombre: getText("nombre"),
            descripcion: getText("descripcion") || undefined,
            precioVenta: getNumber("precioVenta"),
            costoPromedio: getNumber("costoPromedio"),
            stockMinimo: getNumber("stockMinimo"),
            stockMaximo: getNumber("stockMaximo") || undefined,
            puntoReorden: getNumber("puntoReorden") || undefined,
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
          razonSocial: getText("razonSocial") || getText("nombre") || "Proveedor",
          ruc: getText("ruc"),
          correo: getText("correo") || undefined,
          telefono: getText("telefono") || undefined,
          leadTimePromedioDias: getNumber("leadTimeDias") || 3,
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
        if (!rolId) {
          throw new Error("No hay roles disponibles para asignar al usuario");
        }
        await iamApi.createUsuario({
          nombre: getText("nombre"),
          correo: getText("correo").toLowerCase(),
          password: getText("password"),
          rolId,
        });
        notify("Usuario del equipo registrado");
      } else if (kind === "movement") {
        if (movementLines.length === 0) {
          throw new Error("Debes agregar al menos un producto al listado del movimiento");
        }

        const isEntrada = movementType === "ENTRADA_COMPRA";
        const isTransfer =
          movementType === "TRASLADO_INTERNO" || movementType === "TRANSFERENCIA";
        const isMerma =
          movementType === "SALIDA_MERMA" || movementType === "MERMA_VENCIMIENTO";
        const isSalida = movementType === "SALIDA_VENTA";
        const isAjuste =
          movementType === "AJUSTE_INVENTARIO" || movementType.startsWith("AJUSTE");

        const normalizedTipo = isTransfer
          ? "TRASLADO_INTERNO"
          : isMerma
            ? "SALIDA_MERMA"
            : isAjuste
              ? "AJUSTE_INVENTARIO"
              : isSalida
                ? "SALIDA_VENTA"
                : "ENTRADA_COMPRA";

        let finalOrigenId: string | undefined = undefined;
        let finalDestinoId: string | undefined = undefined;

        if (normalizedTipo === "ENTRADA_COMPRA") {
          finalOrigenId = undefined;
          finalDestinoId = movementDestWarehouse || warehouses[0]?.id;
          if (!finalDestinoId) throw new Error("Debes seleccionar el almacén de destino");
        } else if (normalizedTipo === "TRASLADO_INTERNO") {
          finalOrigenId = movementOriginWarehouse || warehouses[0]?.id;
          finalDestinoId = movementDestWarehouse;
          if (!finalOrigenId || !finalDestinoId || finalOrigenId === finalDestinoId) {
            throw new Error("Debes seleccionar un almacén de origen y un almacén de destino distintos");
          }
        } else if (normalizedTipo === "SALIDA_VENTA" || normalizedTipo === "SALIDA_MERMA") {
          finalOrigenId = movementOriginWarehouse || warehouses[0]?.id;
          finalDestinoId = undefined;
          if (!finalOrigenId) throw new Error("Debes seleccionar el almacén de origen del despacho");
        } else {
          // Ajuste
          finalOrigenId = movementOriginWarehouse || undefined;
          finalDestinoId = movementDestWarehouse || (!finalOrigenId ? warehouses[0]?.id : undefined);
        }

        const currentWarehouse =
          warehouses.find((w) => w.id === (finalDestinoId || finalOrigenId)) || warehouses[0];
        const sucursalId = currentWarehouse?.sucursalId || sucursales[0]?.id;

        const detallesPayload = movementLines.map((line) => ({
          productoId: line.productoId,
          cantidad: line.cantidad,
          costoUnitario: line.costoUnitario,
          numeroLote: line.numeroLote,
          codigoLote: line.numeroLote,
          fechaVencimiento: line.fechaVencimiento,
        }));

        if (edit) {
          await inventoryApi.updateMovimiento(edit.id, {
            tipo: normalizedTipo,
            motivo: `${normalizedTipo} de inventario`,
            almacenOrigenId: finalOrigenId,
            almacenDestinoId: finalDestinoId,
            proveedorId: movementSupplierId || null,
            detalles: detallesPayload,
          });
          notify("Movimiento actualizado y existencias recalculadas con éxito");
        } else {
          const createdMovement = await inventoryApi.createMovimiento({
            tipo: normalizedTipo,
            sucursalId,
            motivo: `${normalizedTipo} de inventario`,
            almacenOrigenId: finalOrigenId,
            almacenDestinoId: finalDestinoId,
            proveedorId: movementSupplierId || undefined,
            detalles: detallesPayload,
          });

          // Automatically approve and complete if checked
          if (getText("autoComplete") === "on") {
            await inventoryApi.aprobarMovimiento(createdMovement.id);
            await inventoryApi.completarMovimiento(createdMovement.id);
            notify("Movimiento registrado y aplicado al Kardex");
          } else {
            notify("Movimiento guardado como borrador");
          }
        }
      } else if (kind === "sale") {
        if (cart.length === 0) {
          throw new Error("Debes agregar al menos un producto al detalle de la venta");
        }

        const selectedPm =
          paymentMethods.find((pm) => pm.id === selectedPaymentMethod) ||
          paymentMethods[0];
        if (!selectedPm) {
          throw new Error("No hay métodos de pago activos disponibles");
        }

        const createdSale = await salesApi.createVenta({
          almacenDespachoId: selectedWarehouse,
          tipoComprobante,
          autoCorrelativo: true,
          clienteNombre: getText("clienteNombre") || "Cliente Mostrador",
          clienteDocumento: getText("clienteDocumento") || undefined,
          detalles: cart.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
          })),
          pagos: [
            {
              metodoPagoId: selectedPm.id,
              monto: cartTotal,
              referencia: getText("referenciaPago") || undefined,
            },
          ],
        });
        const numComprobanteOficial =
          (createdSale as any)?.numero_comprobante ||
          createdSale?.numeroComprobante ||
          "EMITIDA";
        notify(
          `¡Venta registrada con éxito! Comprobante emitido: ${numComprobanteOficial} (Total: S/ ${cartTotal.toFixed(2)})`,
        );
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

  return (
    <form onSubmit={submit} className="record-form">
      {kind === "product" && (
        <>
          <div className="form-grid">
            <Field label="Código SKU (Autogenerado por el sistema)">
              <input
                name="sku"
                required
                value={autoSku}
                readOnly
                placeholder="PRD-0001"
                style={{
                  background: "#f1f5ee",
                  color: "#1c3528",
                  fontWeight: 700,
                  cursor: "not-allowed",
                  borderColor: "#c8d4c5",
                }}
              />
            </Field>
            <Field label="Código de Barras (Opcional)">
              <input
                name="codigoBarras"
                defaultValue={edit?.codigoBarras}
                maxLength={50}
                placeholder="Ej. 7751234567890 (Escanea o ingresa EAN-13)"
              />
            </Field>
            <Field label="Nombre del Producto">
              <input
                name="nombre"
                required
                defaultValue={edit?.nombre}
                maxLength={120}
                placeholder="Ej. Arroz Extra Costeño 1 Kg"
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
                placeholder="Ej. 4.80 (Precio al público)"
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
                  placeholder="Ej. 3.20 (Costo inicial de compra)"
                />
              </Field>
            )}
            <Field label="Stock Mínimo (Alerta)">
              <input
                name="stockMinimo"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={edit?.stockMinimo}
                placeholder="Ej. 10 (Alerta stock bajo)"
              />
            </Field>
            <Field label="Punto de Reorden (ROP)">
              <input
                name="puntoReorden"
                type="number"
                min="0"
                step="1"
                defaultValue={edit?.puntoReorden}
                placeholder="Ej. 15 (Punto de reposición)"
              />
            </Field>
            {!edit && (
              <Field label="Stock Máximo">
                <input
                  name="stockMaximo"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="Ej. 100 (Capacidad máxima)"
                />
              </Field>
            )}
          </div>
          <Field label="Descripción / Especificaciones">
            <input
              name="descripcion"
              defaultValue={edit?.descripcion}
              placeholder="Ej. Empaque sellado de 1 Kg, lote de consumo masivo..."
            />
          </Field>
        </>
      )}

      {kind === "supplier" && (
        <div className="form-grid">
          <Field label="Razón Social / Nombre Comercial">
            <input
              name="nombre"
              required
              maxLength={120}
              placeholder="Ej. Distribuidora Central de Alimentos S.A.C."
            />
          </Field>
          <Field label="RUC (11 dígitos)">
            <input
              name="ruc"
              required
              pattern="[0-9]{11}"
              maxLength={11}
              placeholder="Ej. 20601234567 (11 dígitos exactos)"
            />
          </Field>
          <Field label="Correo Electrónico">
            <input
              name="correo"
              type="email"
              placeholder="Ej. pedidos@distribuidora.com.pe"
            />
          </Field>
          <Field label="Teléfono de Contacto">
            <input
              name="telefono"
              type="tel"
              placeholder="Ej. 987654321 o (01) 456-7890"
            />
          </Field>
          <Field label="Tiempo de Entrega / Lead Time (días)">
            <input
              name="leadTimeDias"
              type="number"
              min="1"
              step="1"
              required
              placeholder="Ej. 3 (Días promedio de entrega)"
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
              placeholder="Ej. Almacén Central de Bebidas"
            />
          </Field>
          <Field label="Código Interno">
            <input
              name="codigo"
              required
              maxLength={20}
              placeholder="Ej. ALM-01 (Código interno)"
            />
          </Field>
          <Field label="Tipo de Almacén">
            <select name="tipo" defaultValue="PULMON">
              <option value="PRINCIPAL">PRINCIPAL (Distribución)</option>
              <option value="PULMON">PULMÓN (Ventas / Mostrador)</option>
              <option value="MERMAS_CUARENTENA">
                MERMAS / CUARENTENA (Aislado)
              </option>
            </select>
          </Field>
        </div>
      )}

      {kind === "user" && (
        <div className="form-grid">
          <Field label="Nombre Completo">
            <input
              name="nombre"
              required
              placeholder="Ej. Carlos Mendoza Salas"
            />
          </Field>
          <Field label="Correo Electrónico">
            <input
              name="correo"
              required
              type="email"
              placeholder="Ej. carlos.mendoza@inventix.pe"
            />
          </Field>
          <Field label="Contraseña Temporal">
            <input
              name="password"
              required
              minLength={6}
              type="password"
              placeholder="Mínimo 6 caracteres seguros"
            />
          </Field>
          <Field label="Rol Asignado">
            <select name="rolId" defaultValue={roles[0]?.id}>
              {roles.length > 0 ? (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre} {r.descripcion ? `(${r.descripcion})` : ""}
                  </option>
                ))
              ) : (
                <option value="OPERADOR_ALMACEN">OPERADOR_ALMACEN</option>
              )}
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
                  Entrada por Compra (Ingreso a almacén)
                </option>
                <option value="TRASLADO_INTERNO">
                  Traslado Interno entre Almacenes
                </option>
                <option value="SALIDA_MERMA">
                  Merma / Pérdida por Vencimiento
                </option>
                <option value="SALIDA_VENTA">
                  Salida de Inventario (Despacho)
                </option>
                <option value="AJUSTE_INVENTARIO">
                  Ajuste de Inventario (+ / -)
                </option>
              </select>
            </Field>

            {/* ALMACÉN ORIGEN (si la operación descuenta existencias) */}
            {(movementType === "TRASLADO_INTERNO" ||
              movementType === "TRANSFERENCIA" ||
              movementType === "SALIDA_VENTA" ||
              movementType === "SALIDA_MERMA") && (
              <Field label="Almacén de Origen (Desde donde sale)">
                <select
                  value={movementOriginWarehouse}
                  onChange={(e) => setMovementOriginWarehouse(e.target.value)}
                  required
                >
                  <option value="">Selecciona almacén de origen</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nombre} ({w.tipo})
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* ALMACÉN DESTINO (si la operación recibe existencias) */}
            {(movementType === "ENTRADA_COMPRA" ||
              movementType === "TRASLADO_INTERNO" ||
              movementType === "TRANSFERENCIA") && (
              <Field
                label={
                  movementType === "ENTRADA_COMPRA"
                    ? "Almacén de Destino (Donde ingresa)"
                    : "Almacén de Destino (Hacia donde va)"
                }
              >
                <select
                  value={movementDestWarehouse}
                  onChange={(e) => setMovementDestWarehouse(e.target.value)}
                  required
                >
                  <option value="">Selecciona almacén de destino</option>
                  {warehouses
                    .filter((w) =>
                      movementType === "TRASLADO_INTERNO"
                        ? w.id !== movementOriginWarehouse
                        : true,
                    )
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.nombre} ({w.tipo})
                      </option>
                    ))}
                </select>
              </Field>
            )}

            {/* PROVEEDOR (Para Entrada por Compra o compras agrupadas) */}
            {movementType === "ENTRADA_COMPRA" && (
              <Field label="Proveedor Asignado (Opcional - compra en grupo)">
                <select
                  value={movementSupplierId}
                  onChange={(e) => setMovementSupplierId(e.target.value)}
                >
                  <option value="">Sin proveedor asignado (Opcional)</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.razonSocial || s.nombre} {s.ruc ? `(RUC: ${s.ruc})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {movementType === "AJUSTE_INVENTARIO" && (
              <Field label="Almacén a Ajustar">
                <select
                  value={movementDestWarehouse || movementOriginWarehouse}
                  onChange={(e) => {
                    setMovementDestWarehouse(e.target.value);
                    setMovementOriginWarehouse(e.target.value);
                  }}
                  required
                >
                  <option value="">Selecciona almacén</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nombre} ({w.tipo})
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>

          {/* CAJA PARA AGREGAR PRODUCTOS AL MOVIMIENTO */}
          <div
            style={{
              background: "#f8faf7",
              border: "1px solid #dce4dc",
              borderRadius: 8,
              padding: 14,
              marginTop: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: "#24372b" }}>
                Agregar Productos al Movimiento
              </span>
              {Boolean(
                (movementType === "TRASLADO_INTERNO" ||
                  movementType === "SALIDA_VENTA" ||
                  movementType === "SALIDA_MERMA") &&
                  movementOriginWarehouse &&
                  selectedProduct,
              ) && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      getStockInWarehouse(selectedProduct, movementOriginWarehouse) > 0
                        ? "#166534"
                        : "#dc2626",
                    background:
                      getStockInWarehouse(selectedProduct, movementOriginWarehouse) > 0
                        ? "#dcfce7"
                        : "#fee2e2",
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  Stock en origen:{" "}
                  {getStockInWarehouse(selectedProduct, movementOriginWarehouse)} uds
                </span>
              )}
            </div>

            <div className="form-grid" style={{ marginBottom: 10 }}>
              <div className="field">
                <span>Producto</span>
                <SearchableProductSelect
                  products={products}
                  selectedProductId={selectedProduct}
                  onSelect={(id) => setSelectedProduct(id)}
                />
              </div>

              <Field label="Cantidad">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={addQuantity}
                  onChange={(e) => setAddQuantity(Number(e.target.value))}
                  placeholder="Ej. 10"
                />
              </Field>

              {movementType === "ENTRADA_COMPRA" && (
                <>
                  <Field label="Costo Unitario (S/)">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={addCost}
                      onChange={(e) => setAddCost(e.target.value)}
                      placeholder={
                        selectedProductData?.costoPromedio
                          ? `Ej. ${selectedProductData.costoPromedio}`
                          : "Ej. 3.50"
                      }
                    />
                  </Field>
                  <Field label="Número de Lote (Opcional)">
                    <input
                      value={addLote}
                      onChange={(e) => setAddLote(e.target.value)}
                      placeholder="Ej. LOT-2026-NOV"
                    />
                  </Field>
                  <Field label="Fecha de Vencimiento">
                    <input
                      type="date"
                      value={addFechaVenc}
                      onChange={(e) => setAddFechaVenc(e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>

            <button
              type="button"
              className="secondary"
              onClick={handleAddMovementLine}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Plus size={15} /> Añadir producto al listado
            </button>
          </div>

          {/* TABLA DE PRODUCTOS EN EL MOVIMIENTO */}
          <div style={{ marginTop: 14 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#34493b",
                display: "block",
                marginBottom: 6,
              }}
            >
              Líneas del Movimiento ({movementLines.length}{" "}
              {movementLines.length === 1 ? "producto" : "productos"})
            </span>

            {movementLines.length === 0 ? (
              <div
                style={{
                  border: "1px dashed #c8d4c9",
                  borderRadius: 8,
                  padding: "16px",
                  textAlign: "center",
                  color: "#6b7c70",
                  fontSize: 12,
                  background: "#fafbfa",
                }}
              >
                No hay productos añadidos a este movimiento todavía. Selecciona un producto
                arriba y presiona <strong>"Añadir producto al listado"</strong>.
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #dce4dc",
                  borderRadius: 8,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                  }}
                >
                  <thead
                    style={{
                      background: "#f2f5f2",
                      color: "#475c4d",
                      textAlign: "left",
                    }}
                  >
                    <tr>
                      <th style={{ padding: "8px 10px" }}>SKU</th>
                      <th style={{ padding: "8px 10px" }}>Producto</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>
                        Cantidad
                      </th>
                      {movementType === "ENTRADA_COMPRA" && (
                        <>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>
                            Costo Unit.
                          </th>
                          <th style={{ padding: "8px 10px" }}>Lote</th>
                        </>
                      )}
                      <th
                        style={{
                          padding: "8px 10px",
                          textAlign: "center",
                          width: 50,
                        }}
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementLines.map((line, idx) => (
                      <tr key={idx} style={{ borderTop: "1px solid #eef2ef" }}>
                        <td
                          style={{
                            padding: "8px 10px",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#166534",
                          }}
                        >
                          {line.producto?.sku || line.productoId.slice(0, 8)}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          {line.producto?.nombre || "Producto"}
                        </td>
                        <td
                          style={{
                            padding: "8px 10px",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        >
                          {line.cantidad} uds
                        </td>
                        {movementType === "ENTRADA_COMPRA" && (
                          <>
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "right",
                              }}
                            >
                              {line.costoUnitario !== undefined
                                ? `S/ ${line.costoUnitario.toFixed(2)}`
                                : "—"}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              {line.numeroLote ? (
                                <span>
                                  <strong>{line.numeroLote}</strong>
                                  {line.fechaVencimiento
                                    ? ` (vence: ${line.fechaVencimiento})`
                                    : ""}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </>
                        )}
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button
                            type="button"
                            className="icon-button"
                            style={{
                              color: "#dc2626",
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                            }}
                            onClick={() => handleRemoveMovementLine(idx)}
                            title="Quitar producto del movimiento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot
                    style={{
                      background: "#f8faf7",
                      borderTop: "1px solid #dce4dc",
                    }}
                  >
                    <tr>
                      <td colSpan={2} style={{ padding: "8px 10px", fontWeight: 700 }}>
                        Total de Unidades a Mover:
                      </td>
                      <td
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "#166534",
                        }}
                      >
                        {movementLines.reduce((acc, curr) => acc + curr.cantidad, 0)}{" "}
                        uds
                      </td>
                      <td colSpan={movementType === "ENTRADA_COMPRA" ? 3 : 1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {!edit && (
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
          )}
        </>
      )}

      {kind === "sale" && (
        <div className="pos-container">
          <div className="form-grid">
            <Field label="Almacén de Despacho">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                required
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nombre} ({w.tipo})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tipo de Comprobante">
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value)}
              >
                <option value="BOLETA">Boleta de Venta (B001)</option>
                <option value="FACTURA">Factura Electrónica (F001)</option>
                <option value="TICKET">Ticket de Caja (T001)</option>
              </select>
            </Field>

            <Field label="Número de Comprobante">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="pos-badge-auto">
                  <CheckCircle2 size={15} style={{ color: "#28634f" }} />
                  <span>
                    {tipoComprobante === "FACTURA"
                      ? "F001"
                      : tipoComprobante === "TICKET"
                        ? "T001"
                        : "B001"}-AUTO (Se asignará al guardar)
                  </span>
                </div>
                <small style={{ color: "#64748b", fontSize: 11 }}>
                  El correlativo oficial consecutivo se reserva y genera en el servidor al emitir.
                </small>
              </div>
            </Field>

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

            <Field label="Nombre del Cliente (Opcional)">
              <input
                name="clienteNombre"
                placeholder="Ej. Juan Pérez o Bodega Los Rosales"
                defaultValue="Cliente Mostrador"
              />
            </Field>

            <Field label="DNI / RUC del Cliente (Opcional)">
              <input
                name="clienteDocumento"
                placeholder="Ej. 10778899112 (DNI 8 dígitos o RUC 11 dígitos)"
              />
            </Field>

            <Field label="N° Operación / Referencia (Opcional)">
              <input
                name="referenciaPago"
                placeholder="Ej. Operación Yape 884729 o N° Voucher POS"
              />
            </Field>
          </div>

          <div className="pos-add-box">
            <div className="pos-add-box-header">
              <ShoppingCart size={16} style={{ color: "#174b3b" }} />
              <span>Agregar Productos al Carrito POS</span>
            </div>

            <div className="pos-add-controls">
              <div className="pos-ctrl-product">
                <span className="pos-ctrl-label">Buscar / Seleccionar Producto</span>
                <SearchableProductSelect
                  products={products}
                  selectedProductId={selectedProduct}
                  onSelect={(id) => setSelectedProduct(id)}
                  placeholder="Escribe el nombre o SKU (espera 1s para filtrar)..."
                />
              </div>

              <div className="pos-ctrl-qty">
                <span className="pos-ctrl-label">Cantidad</span>
                <div className="pos-qty-input-container">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={addQuantity}
                    onChange={(e) =>
                      setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="pos-qty-field"
                  />
                </div>
              </div>

              <div className="pos-ctrl-btn">
                <button
                  type="button"
                  className="primary pos-add-btn"
                  onClick={handleAddToCart}
                >
                  <Plus size={16} />
                  <span>Agregar al Carrito</span>
                </button>
              </div>
            </div>

            {selectedProductData && (
              <div className="pos-product-preview-bar">
                <span>
                  Catálogo: <strong>{selectedProductData.sku} · {selectedProductData.nombre}</strong>
                </span>
                <span>
                  Precio: <strong>S/ {Number(selectedProductData.precioVenta || 0).toFixed(2)}</strong> ({selectedProductData.unidadMedida?.simbolo || "UND"})
                </span>
                <span>
                  Subtotal: <strong>S/ {(Number(selectedProductData.precioVenta || 0) * (addQuantity || 1)).toFixed(2)}</strong>
                </span>
                {(selectedProductData.manejaLotes || selectedProductData.maneja_lotes) && (
                  <span className="badge green" style={{ fontSize: 10 }}>
                    Lote FEFO auto
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="pos-cart-panel">
            <div className="pos-cart-header">
              <strong style={{ fontSize: 13, color: "#22382c" }}>
                Detalle de la Venta ({cart.length}{" "}
                {cart.length === 1 ? "producto" : "productos"})
              </strong>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#b65042",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Vaciar carrito
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 12px",
                  color: "#889988",
                  fontSize: 12,
                }}
              >
                <ShoppingCart
                  size={28}
                  style={{ margin: "0 auto 8px", opacity: 0.4 }}
                />
                <p>
                  El carrito está vacío. Selecciona un producto arriba y haz clic en{" "}
                  <strong>Agregar</strong>.
                </p>
              </div>
            ) : (
              <table className="pos-cart-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ textAlign: "right" }}>P. Unitario</th>
                    <th style={{ textAlign: "center" }}>Cantidad</th>
                    <th style={{ textAlign: "right" }}>Subtotal</th>
                    <th style={{ width: 40, textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productoId}>
                      <td>
                        <strong>{item.producto.nombre}</strong>
                        <small
                          style={{
                            display: "block",
                            color: "#889988",
                            fontSize: 10,
                          }}
                        >
                          {item.producto.sku}
                        </small>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 500 }}>
                        S/ {item.precioUnitario.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className="pos-qty-control">
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => handleUpdateQty(item.productoId, -1)}
                            title="Disminuir"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="pos-qty-val">{item.cantidad}</span>
                          <button
                            type="button"
                            className="pos-qty-btn"
                            onClick={() => handleUpdateQty(item.productoId, 1)}
                            title="Aumentar"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 600,
                          color: "#174b3b",
                        }}
                      >
                        S/ {item.subtotal.toFixed(2)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productoId)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#be6051",
                            cursor: "pointer",
                            padding: 4,
                          }}
                          title="Quitar"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="pos-total-card">
              <div>
                <span
                  style={{
                    fontSize: 11,
                    color: "#4d6957",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Total a Pagar
                </span>
                <div style={{ fontSize: 11, color: "#778877" }}>
                  {cart.reduce((acc, i) => acc + i.cantidad, 0)} unidades en total
                </div>
              </div>
              <strong>S/ {cartTotal.toFixed(2)}</strong>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              <Field label="Monto Recibido en Caja (S/)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={`S/ ${cartTotal.toFixed(2)}`}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                />
              </Field>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#4c5d52",
                    marginBottom: 4,
                  }}
                >
                  Vuelto a entregar
                </span>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: vuelto > 0 ? "#28634f" : "#889988",
                  }}
                >
                  S/ {vuelto.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="fefo-note" style={{ marginTop: 12 }}>
              <strong>Deducción FEFO Automática</strong>
              <p>
                El backend consumirá automáticamente los lotes activos con
                vencimiento más próximo para cada producto vendido.
              </p>
            </div>
          </div>
        </div>
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
            : kind === "sale"
              ? `Emitir Comprobante (S/ ${cartTotal.toFixed(2)})`
              : kind === "movement" && edit
                ? "Guardar y Recalcular Movimiento"
                : edit
                  ? "Guardar Cambios"
                  : "Confirmar y Guardar"}
        </button>
      </div>
    </form>
  );
}
