import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { iamApi } from "../../api/services";
import type { IamUserItem } from "../../api/types";
import { Badge, Empty, Table } from "../../components/UI";
import { PageHeader, SearchToolbar, type WorkspacePageProps } from "./shared";

export function UsuariosPage({ openForm, refreshTrigger }: WorkspacePageProps) {
  const [users, setUsers] = useState<IamUserItem[]>([]); const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { setLoading(true); iamApi.getUsuarios().catch(() => []).then((data) => { setUsers(data); setLoading(false); }); }, [refreshTrigger]);
  const query = search.toLowerCase();
  return <><PageHeader title="Usuarios" description="Control de accesos y roles (RBAC) para el equipo del negocio." actions={<button className="primary" onClick={() => openForm("user")}><Plus size={18} /> Invitar Usuario</button>} /><SearchToolbar value={search} onChange={setSearch} /><section className="panel"><Table headers={["Colaborador", "Correo Electrónico", "Rol Asignado", "Estado"]}>{users.filter((item) => `${item.usuario.nombre} ${item.usuario.correo}`.toLowerCase().includes(query)).map((item) => <tr key={item.id}><td><strong>{item.usuario.nombre}</strong></td><td>{item.usuario.correo}</td><td><Badge tone="green">{typeof item.rol === "string" ? item.rol : item.rol.nombre}</Badge></td><td><Badge tone={item.activo ? "green" : "gray"}>{item.activo ? "Activo" : "Inactivo"}</Badge></td></tr>)}</Table>{!users.length && !loading && <Empty text="No se encontraron usuarios" />}</section></>;
}
