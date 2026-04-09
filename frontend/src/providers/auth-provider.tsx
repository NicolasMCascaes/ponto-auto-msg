import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { toast } from 'sonner';
import {
  api,
  setApiAuthToken,
  setApiUnauthorizedHandler,
  type AuthCredentials,
  type AuthSession,
  type AuthUser
} from '@/lib/api';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isBooting: boolean;
  isAuthenticated: boolean;
  login: (input: AuthCredentials) => Promise<AuthUser>;
  logout: () => void;
  refreshCurrentUser: () => Promise<AuthUser | null>;
};

const AUTH_TOKEN_STORAGE_KEY = 'ponto-auto-msg.auth-token';
const AuthContext = createContext<AuthContextValue | null>(null);

function persistToken(token: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const lastUnauthorizedToastAtRef = useRef(0);

  const clearSession = useCallback(() => {
    setApiAuthToken(null);
    persistToken(null);
    startTransition(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  const applySession = useCallback((session: AuthSession) => {
    setApiAuthToken(session.token);
    persistToken(session.token);
    startTransition(() => {
      setUser(session.user);
      setToken(session.token);
    });
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      startTransition(() => {
        setUser(null);
      });
      return null;
    }

    const payload = await api.getCurrentUser();
    const nextUser = payload.data.user;

    startTransition(() => {
      setUser(nextUser);
    });

    return nextUser;
  }, [token]);

  const login = useCallback(
    async (input: AuthCredentials) => {
      const payload = await api.login(input);
      applySession(payload.data);
      return payload.data.user;
    },
    [applySession]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    setApiUnauthorizedHandler(() => {
      const now = Date.now();

      if (now - lastUnauthorizedToastAtRef.current > 2_000) {
        lastUnauthorizedToastAtRef.current = now;
        toast.error('Sua sessão expirou. Faça login novamente.');
      }

      clearSession();
    });

    return () => {
      setApiUnauthorizedHandler(null);
    };
  }, [clearSession]);

  useEffect(() => {
    let isCancelled = false;
    const storedToken = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim();

    if (!storedToken) {
      setApiAuthToken(null);
      setIsBooting(false);
      return;
    }

    setApiAuthToken(storedToken);

    void (async () => {
      try {
        const payload = await api.getCurrentUser();

        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setToken(storedToken);
          setUser(payload.data.user);
        });
      } catch {
        if (!isCancelled) {
          clearSession();
        }
      } finally {
        if (!isCancelled) {
          setIsBooting(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isBooting,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      refreshCurrentUser
    }),
    [isBooting, login, logout, refreshCurrentUser, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
