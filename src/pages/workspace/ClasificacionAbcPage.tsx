import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { analyticsApi } from "../../api/services";
import type { AbcClassification } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { date, money } from "../../utils/format";
import { errorMessage, PageHeader, type WorkspacePageProps } from "./shared";

export function ClasificacionAbcPage({ notify, refreshTrigger }: WorkspacePageProps) {
  const [items, setItems] = useState<AbcClassification[]>([]); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState(false);
  const loadData = useCallback(async () => { setLoading(true); setItems(await analyticsApi.getAbcClassification().catch(() => [])); setLoading(false); }, []);
  useEffect(() => { void loadData(); }, [loadData, refreshTrigger]);
  const update = async () => { try { setUpdating(true); const result = await analyticsApi.updateCalculations(30, 14); notify(`Cálculos actualizados: ${result.updatedClassifications} clasificaciones y ${result.updatedPolicies} políticas de reposición.`); await loadData(); } catch (error) { notify(errorMessage(error, "No se pudieron actualizar los cálculos")); } finally { setUpdating(false); } };
  return <><PageHeader title="Clasificación ABC" description="Priorización del catálogo según su valor de consumo registrado." actions={<button className="primary" onClick={() => void update()} disabled={updating}><RefreshCw size={17} />{updating ? "Actualizando..." : "Actualizar cálculos"}</button>} /><div className="info-banner"><BarChart3 size={24} /><div><strong>Clasificación por valor de consumo</strong><p>Los productos se ordenan usando las ventas y costos registrados durante el periodo analizado.</p></div></div><section className="panel"><div className="panel-heading"><div><h2>Resultado ABC</h2><p>A: mayor impacto, B: impacto intermedio, C: menor impacto.</p></div></div><Table headers={["Producto", "Clasificación", "Valor de consumo", "Participación", "Periodo"]}>{items.map((item) => <tr key={item.id}><td><strong>{item.product.name}</strong><small>{item.product.sku}</small></td><td><Badge tone={item.classification === "A" ? "green" : item.classification === "B" ? "amber" : "gray"}>Clase {item.classification}</Badge></td><td>{money(item.consumptionValue)}</td><td>{item.participationPercentage.toFixed(2)}%</td><td>{date(item.periodStart)} – {date(item.periodEnd)}</td></tr>)}</Table>{!items.length && !loading && <Empty text="No hay datos suficientes para clasificar el catálogo. Registra ventas y actualiza los cálculos." />}</section></>;
}
