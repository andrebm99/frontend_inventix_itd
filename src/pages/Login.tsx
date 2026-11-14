import { useState, type FormEvent } from 'react';
import { Box, ArrowRight, ShieldCheck, Sparkles, Building2, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login, register, createBusiness, user, activeNegocio, negocios } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form states
  const [email, setEmail] = useState('admin@inventix.com');
  const [password, setPassword] = useState('Secret123!');
  const [nombre, setNombre] = useState('Carlos Almacén');

  // New business creation if registered without business
  const [bizNombre, setBizNombre] = useState('Mi Tienda Retail');
  const [bizRuc, setBizRuc] = useState('20' + Math.floor(100000000 + Math.random() * 900000000));
  const [bizTelefono, setBizTelefono] = useState('987654321');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(nombre, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createBusiness(bizNombre, bizRuc, bizTelefono);
    } catch (err: any) {
      setError(err.message || 'Error al registrar negocio');
    } finally {
      setLoading(false);
    }
  };

  const quickDemoLogin = async () => {
    setEmail('admin@inventix.com');
    setPassword('Secret123!');
    setError(null);
    setLoading(true);
    try {
      await login('admin@inventix.com', 'Secret123!');
    } catch (err: any) {
      setError(err.message || 'Error al conectar con credenciales de prueba');
    } finally {
      setLoading(false);
    }
  };

  // If user is authenticated but has no business yet, show business setup wizard
  if (user && (!activeNegocio || negocios.length === 0)) {
    return (
      <div className="login-page">
        <div className="login-story">
          <div className="brand">
            <Box size={28} /> Inventi<span className="brand-x">X</span>
          </div>
          <span className="eyebrow">CONFIGURACIÓN INICIAL</span>
          <h1>Registra tu negocio<span className="heading-dot">.</span></h1>
          <p>
            Bienvenido, <strong>{user.nombre}</strong>. Para activar el control de inventario con IA, crea la sede principal de tu empresa.
          </p>
        </div>

        <section className="login-form panel">
          <span className="card-icon">
            <Building2 size={26} />
          </span>
          <h2>Crea tu Negocio</h2>
          <p>Se creará automáticamente la Sucursal Principal y el Almacén Principal.</p>

          {error && (
            <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleCreateBusiness}>
            <label className="field">
              <span>Nombre Comercial o Razón Social</span>
              <input
                required
                value={bizNombre}
                onChange={(e) => setBizNombre(e.target.value)}
                placeholder="Ej. Minimarket La Esquina"
              />
            </label>

            <label className="field">
              <span>RUC (11 dígitos)</span>
              <input
                required
                maxLength={11}
                pattern="[0-9]{11}"
                value={bizRuc}
                onChange={(e) => setBizRuc(e.target.value)}
                placeholder="20601234567"
              />
            </label>

            <label className="field">
              <span>Teléfono de Contacto</span>
              <input
                value={bizTelefono}
                onChange={(e) => setBizTelefono(e.target.value)}
                placeholder="987654321"
              />
            </label>

            <button className="primary full" type="submit" disabled={loading}>
              {loading ? 'Creando sede...' : 'Comenzar a Gestionar'} <ArrowRight size={17} />
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-story">
        <div className="brand">
          <span>
            <Box size={24} />
          </span>
          Inventi<span className="brand-x">X</span>
        </div>
        <span className="eyebrow">SISTEMA B2B · CONTROL INTELIGENTE</span>
        <h1>
          Más claridad.<br />
          Mejores decisiones.
        </h1>
        <p>
          Tu inventario en tiempo real, trazabilidad FEFO por lotes, ventas y un asistente predictivo con IA. Todo conectado a la API de NestJS.
        </p>

        <div className="login-art">
          <PackageIllustration />
          <span>Stock valorizado · Prevención de mermas · Asistente IA</span>
        </div>
      </div>

      <section className="login-form panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="card-icon">
            <ShieldCheck size={26} />
          </span>
          <div className="segmented">
            <button
              type="button"
              className={tab === 'login' ? 'selected' : ''}
              onClick={() => {
                setTab('login');
                setError(null);
              }}
            >
              <LogIn size={13} style={{ display: 'inline', marginRight: 4 }} />
              Ingresar
            </button>
            <button
              type="button"
              className={tab === 'register' ? 'selected' : ''}
              onClick={() => {
                setTab('register');
                setError(null);
              }}
            >
              <UserPlus size={13} style={{ display: 'inline', marginRight: 4 }} />
              Crear Cuenta
            </button>
          </div>
        </div>

        <h2>{tab === 'login' ? 'Bienvenido a InventiX' : 'Crea tu Cuenta'}</h2>
        <p>
          {tab === 'login'
            ? 'Ingresa tus credenciales para acceder al panel de tu negocio.'
            : 'Regístrate para comenzar a gestionar tu inventario.'}
        </p>

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: 16 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {tab === 'register' && (
            <label className="field">
              <span>Nombre Completo</span>
              <input
                required
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Ana Torres"
              />
            </label>
          )}

          <label className="field">
            <span>Correo Electrónico</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@inventix.com"
            />
          </label>

          <label className="field">
            <span>Contraseña</span>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          <button className="primary full" type="submit" disabled={loading} style={{ marginTop: 10 }}>
            {loading ? 'Validando...' : tab === 'login' ? 'Entrar al Negocio' : 'Registrar y Continuar'}{' '}
            <ArrowRight size={17} />
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #edf0e6' }}>
          <button
            type="button"
            className="secondary full"
            onClick={quickDemoLogin}
            disabled={loading}
            style={{ fontSize: 12 }}
          >
            <Sparkles size={15} style={{ color: '#b79a60' }} />
            Entrar con Acceso Rápido Demo (Carlos Admin)
          </button>
        </div>

        <small style={{ display: 'block', marginTop: 14, textAlign: 'center' }}>
          API Backend NestJS activa en <code>localhost:3000</code>. Autenticación JWT y RBAC multi-tenant.
        </small>
      </section>
    </div>
  );
}

function PackageIllustration() {
  return (
    <svg viewBox="0 0 300 160" aria-hidden="true">
      <path d="M25 90 90 55 155 90 90 125Z" fill="#e9cc8a" />
      <path d="M25 90v45l65 35v-45Z" fill="#c0a265" />
      <path d="M90 125v45l65-35V90Z" fill="#dcb874" />
      <path d="m155 40 60-32 60 32-60 32Z" fill="#f2e8d3" />
      <path d="M155 40v65l60 33V72Z" fill="#c9d8c8" />
      <path d="M215 72v66l60-33V40Z" fill="#98b69f" />
    </svg>
  );
}
