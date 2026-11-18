import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import { TOKEN_KEY } from "../api/client";
import type { Me, Role } from "../types";

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<Me>;
  register: (body: Record<string, unknown>) => Promise<Me>;
  logout: () => void;
  refresh: () => Promise<void>;
  isStaff: boolean;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setUser(null);
      return;
    }
    try {
      setUser(await api.auth.me());
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [refresh]);

  const login = async (username: string, password: string) => {
    const { token } = await api.auth.login(username, password);
    localStorage.setItem(TOKEN_KEY, token);
    const me = await api.auth.me();
    setUser(me);
    return me;
  };

  const register = async (body: Record<string, unknown>) => {
    const { token } = await api.auth.register(body);
    localStorage.setItem(TOKEN_KEY, token);
    const me = await api.auth.me();
    setUser(me);
    return me;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refresh, hasRole, isStaff: hasRole("LIBRARIAN", "ADMIN") }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth phải dùng bên trong AuthProvider");
  return ctx;
}
