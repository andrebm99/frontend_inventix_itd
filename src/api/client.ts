const API_BASE = '/api/v1';

export function getToken(): string | null {
  return localStorage.getItem('inventix_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('inventix_token', token);
  } else {
    localStorage.removeItem('inventix_token');
  }
}

export function getNegocioId(): string | null {
  return localStorage.getItem('inventix_negocio_id');
}

export function setNegocioId(id: string | null): void {
  if (id) {
    localStorage.setItem('inventix_negocio_id', id);
  } else {
    localStorage.removeItem('inventix_negocio_id');
  }
}

export function clearSession(): void {
  localStorage.removeItem('inventix_token');
  localStorage.removeItem('inventix_negocio_id');
  localStorage.removeItem('inventix_user');
  sessionStorage.clear();
}

export class ApiError extends Error {
  statusCode: number;
  data: any;
  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const negocioId = getNegocioId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (negocioId) {
    headers['x-negocio-id'] = negocioId;
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      'No se pudo conectar con el servidor. Inténtalo nuevamente en unos momentos.',
      0,
      err,
    );
  }

  if (response.status === 401) {
    if (!path.includes('/auth/login') && !path.includes('/auth/register')) {
      clearSession();
      window.dispatchEvent(new CustomEvent('inventix:unauthorized'));
    }
  }

  let body: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    body = await response.json();
  } else {
    const text = await response.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    let msg = 'Ocurrió un error en la solicitud.';
    if (body) {
      if (Array.isArray(body.message)) {
        msg = body.message.join('. ');
      } else if (typeof body.message === 'string') {
        msg = body.message;
      } else if (body.error) {
        msg = body.error;
      }
    }
    throw new ApiError(msg, response.status, body);
  }

  return body as T;
}

