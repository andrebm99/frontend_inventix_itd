import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Plus, ShieldCheck, X } from "lucide-react";
import { iamApi } from "../../api/services";
import type { IamPermission, IamRole, IamUserItem } from "../../api/types";
import { useAuth } from "../../context/AuthContext";
import { Badge, Empty, Field, Table } from "../../components/UI";
import {
  errorMessage,
  PageHeader,
  SearchToolbar,
  type WorkspacePageProps,
} from "./shared";

export function UsuariosPage({
  openForm,
  refreshTrigger,
  hasPermission,
  notify,
}: WorkspacePageProps) {
  const { activeNegocio } = useAuth();
  const [users, setUsers] = useState<IamUserItem[]>([]);
  const [roles, setRoles] = useState<IamRole[]>([]);
  const [permissions, setPermissions] = useState<IamPermission[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<IamRole | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  // Carga solo los usuarios, roles y permisos que el usuario puede consultar.
  const loadData = useCallback(async () => {
    setLoading(true);
    const [loadedUsers, loadedRoles, loadedPermissions] = await Promise.all([
      hasPermission("usuario:read")
        ? iamApi.getUsuarios().catch(() => [])
        : Promise.resolve([]),
      hasPermission("rol:read")
        ? iamApi.getRoles().catch(() => [])
        : Promise.resolve([]),
      hasPermission("rol:read")
        ? iamApi.getPermissions().catch(() => [])
        : Promise.resolve([]),
    ]);
    setUsers(loadedUsers);
    setRoles(loadedRoles);
    setPermissions(loadedPermissions);
    setLoading(false);
  }, [hasPermission]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshTrigger]);

  // Limita los permisos delegables a los que posee el rol actual.
  const grantablePermissions = useMemo(() => {
    if (!activeNegocio) return [];
    if (activeNegocio.rol.nivelJerarquia >= 100) return permissions;
    return permissions.filter((permission) =>
      activeNegocio.rol.permisos.includes(permission.clave),
    );
  }, [activeNegocio, permissions]);

  const maxRoleLevel =
    activeNegocio?.rol.nivelJerarquia && activeNegocio.rol.nivelJerarquia < 100
      ? activeNegocio.rol.nivelJerarquia - 1
      : 99;

  // Crea o actualiza un rol con los permisos seleccionados en el formulario.
  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const permisoClaves = data.getAll("permisos").map(String);
    if (permisoClaves.length === 0) {
      notify("Selecciona al menos un permiso para el rol.");
      return;
    }
    try {
      setSavingRole(true);
      const payload = {
        nombre: String(data.get("nombre") || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "_"),
        descripcion: String(data.get("descripcion") || "").trim() || undefined,
        nivelJerarquia: Number(data.get("nivelJerarquia")),
        permisoClaves,
      };
      if (editingRole) await iamApi.updateRole(editingRole.id, payload);
      else await iamApi.createRole(payload);
      notify(
        editingRole
          ? "Rol actualizado correctamente."
          : "Rol creado correctamente.",
      );
      setShowRoleForm(false);
      setEditingRole(null);
      await loadData();
    } catch (error) {
      notify(errorMessage(error, "No se pudo crear el rol"));
    } finally {
      setSavingRole(false);
    }
  }

  const query = search.toLowerCase();
  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Control de accesos basado en permisos y jerarquía para el equipo del negocio."
        actions={
          <>
            {hasPermission("rol:write") && (
              <button
                className="secondary"
                onClick={() => {
                  setEditingRole(null);
                  setShowRoleForm((visible) => !visible);
                }}
              >
                <ShieldCheck size={18} /> Nuevo Rol
              </button>
            )}
            {hasPermission("usuario:invite") && (
              <button className="primary" onClick={() => openForm("user")}>
                <Plus size={18} /> Invitar Usuario
              </button>
            )}
          </>
        }
      />

      {showRoleForm && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-heading">
            <div>
              <h2>
                {editingRole
                  ? "Editar rol personalizado"
                  : "Crear rol personalizado"}
              </h2>
              <p>
                Solo puedes delegar permisos y niveles inferiores a los de tu
                rol.
              </p>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                setShowRoleForm(false);
                setEditingRole(null);
              }}
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
          <form
            key={editingRole?.id ?? "new-role"}
            onSubmit={(event) => void createRole(event)}
          >
            <div className="form-grid">
              <Field label="Nombre del rol">
                <input
                  name="nombre"
                  required
                  maxLength={50}
                  placeholder="Ej. Cajero turno noche"
                  defaultValue={editingRole?.nombre}
                />
              </Field>
              <Field label={`Nivel jerárquico (1-${maxRoleLevel})`}>
                <input
                  name="nivelJerarquia"
                  required
                  type="number"
                  min={1}
                  max={maxRoleLevel}
                  defaultValue={
                    editingRole?.nivel_jerarquia ?? Math.min(10, maxRoleLevel)
                  }
                />
              </Field>
              <Field label="Descripción">
                <input
                  name="descripcion"
                  maxLength={200}
                  placeholder="Responsabilidad principal del rol"
                  defaultValue={editingRole?.descripcion}
                />
              </Field>
            </div>
            <div style={{ marginTop: 18 }}>
              <strong style={{ fontSize: 13 }}>Permisos del rol</strong>
              <div className="permission-grid">
                {grantablePermissions.map((permission) => (
                  <label className="permission-option" key={permission.id}>
                    <input
                      type="checkbox"
                      name="permisos"
                      value={permission.clave}
                      defaultChecked={editingRole?.permisos.includes(
                        permission.clave,
                      )}
                    />
                    <span>
                      <strong>{permission.clave}</strong>
                      <small>{permission.descripcion}</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowRoleForm(false);
                  setEditingRole(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="primary" disabled={savingRole}>
                {savingRole
                  ? "Guardando..."
                  : editingRole
                    ? "Guardar Cambios"
                    : "Crear Rol"}
              </button>
            </div>
          </form>
        </section>
      )}

      <SearchToolbar value={search} onChange={setSearch} />
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Miembros</h2>
            <p>El rol asignado determina las operaciones permitidas.</p>
          </div>
        </div>
        <Table
          headers={[
            "Colaborador",
            "Correo Electrónico",
            "Rol Asignado",
            "Estado",
          ]}
        >
          {users
            .filter((item) =>
              `${item.usuario.nombre} ${item.usuario.correo}`
                .toLowerCase()
                .includes(query),
            )
            .map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.usuario.nombre}</strong>
                </td>
                <td>{item.usuario.correo}</td>
                <td>
                  <Badge tone="green">
                    {typeof item.rol === "string" ? item.rol : item.rol.nombre}
                  </Badge>
                </td>
                <td>
                  <Badge tone={item.activo ? "green" : "gray"}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
              </tr>
            ))}
        </Table>
        {!users.length && !loading && (
          <Empty text="No se encontraron usuarios" />
        )}
      </section>

      {hasPermission("rol:read") && (
        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel-heading">
            <div>
              <h2>Roles disponibles</h2>
              <p>
                Los roles globales son plantillas del sistema; los
                personalizados pertenecen a este negocio.
              </p>
            </div>
          </div>
          <Table headers={["Rol", "Origen", "Nivel", "Permisos", "Acción"]}>
            {roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.nombre}</strong>
                  <small>{role.descripcion || "Sin descripción"}</small>
                </td>
                <td>
                  <Badge tone={role.esGlobal ? "gray" : "green"}>
                    {role.esGlobal ? "Sistema" : "Personalizado"}
                  </Badge>
                </td>
                <td>{role.nivel_jerarquia ?? 1}</td>
                <td>
                  <small>{role.permisos.join(", ")}</small>
                </td>
                <td>
                  {hasPermission("rol:write") &&
                    !role.esGlobal &&
                    (role.nivel_jerarquia ?? 1) <
                      (activeNegocio?.rol.nivelJerarquia ?? 0) && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setEditingRole(role);
                          setShowRoleForm(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Editar
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </Table>
          {!roles.length && !loading && (
            <Empty text="No hay roles disponibles" />
          )}
        </section>
      )}
    </>
  );
}
