import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { authApi, negocioApi } from '../api/services';
import {
  getToken,
  setToken,
  getNegocioId,
  setNegocioId,
  clearSession,
} from '../api/client';
import type { BusinessItem, UserProfile } from '../api/types';

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  negocios: BusinessItem[];
  activeNegocio: BusinessItem | null;
  loading: boolean;
  error: string | null;
  login: (correo: string, pass: string) => Promise<void>;
  register: (nombre: string, correo: string, pass: string) => Promise<void>;
  createBusiness: (nombre: string, ruc: string, telefono?: string) => Promise<void>;
  switchNegocio: (id: string) => void;
  logout: () => void;
  refreshNegocios: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const u = localStorage.getItem('inventix_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [negocios, setNegocios] = useState<BusinessItem[]>([]);
  const [activeNegocio, setActiveNegocio] = useState<BusinessItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const switchNegocio = useCallback((id: string) => {
    setNegocioId(id);
    const found = negocios.find((b) => b.id === id);
    if (found) {
      setActiveNegocio(found);
    }
  }, [negocios]);

  const refreshNegocios = useCallback(async () => {
    if (!getToken()) return;
    try {
      const list = await negocioApi.getMyBusinesses();
      setNegocios(list);
      if (list.length > 0) {
        const storedId = getNegocioId();
        const current = list.find((b) => b.id === storedId) || list[0];
        setNegocioId(current.id);
        setActiveNegocio(current);
      } else {
        setActiveNegocio(null);
      }
    } catch (err: any) {
      console.warn('Error refreshing businesses:', err);
    }
  }, []);

  const initAuth = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const { usuario, negocios: userBusinesses } = await authApi.getMe();
      setUser(usuario);
      localStorage.setItem('inventix_user', JSON.stringify(usuario));
      setNegocios(userBusinesses);

      if (userBusinesses.length > 0) {
        const storedId = getNegocioId();
        const current = userBusinesses.find((business) => business.id === storedId) || userBusinesses[0];
        setNegocioId(current.id);
        setActiveNegocio(current);
      } else {
        setNegocioId(null);
        setActiveNegocio(null);
      }
    } catch (err: any) {
      console.warn('Session expired or server unavailable:', err);
      clearSession();
      setTokenState(null);
      setUser(null);
      setActiveNegocio(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();

    const handleUnauthorized = () => {
      setTokenState(null);
      setUser(null);
      setActiveNegocio(null);
      setNegocios([]);
    };

    window.addEventListener('inventix:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('inventix:unauthorized', handleUnauthorized);
    };
  }, [initAuth]);

  const login = async (correo: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ correo, password: pass });
      setToken(res.accessToken);
      setTokenState(res.accessToken);
      setUser(res.usuario);
      localStorage.setItem('inventix_user', JSON.stringify(res.usuario));
      setNegocios(res.negocios);

      if (res.negocios.length > 0) {
        const defaultBiz = res.negocios[0];
        setNegocioId(defaultBiz.id);
        setActiveNegocio(defaultBiz);
      } else {
        setNegocioId(null);
        setActiveNegocio(null);
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (nombre: string, correo: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.register({ nombre, correo, password: pass });
      setToken(res.accessToken);
      setTokenState(res.accessToken);
      setUser(res.usuario);
      localStorage.setItem('inventix_user', JSON.stringify(res.usuario));

      // Fetch or initialize businesses
      await refreshNegocios();
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createBusiness = async (nombre: string, ruc: string, telefono?: string) => {
    setError(null);
    setLoading(true);
    try {
      const newBiz = await negocioApi.create({
        nombre,
        ruc,
        telefono,
      });
      await refreshNegocios();
      setNegocioId(newBiz.id);
    } catch (err: any) {
      setError(err.message || 'Error al crear negocio');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearSession();
    setTokenState(null);
    setUser(null);
    setNegocios([]);
    setActiveNegocio(null);
    window.location.hash = '#Resumen';
  };

  return (
    <AuthContext.Provider
      value={{
        token: tokenState,
        user,
        negocios,
        activeNegocio,
        loading,
        error,
        login,
        register,
        createBusiness,
        switchNegocio,
        logout,
        refreshNegocios,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

