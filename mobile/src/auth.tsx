import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore, type Me } from "./api";

interface AuthState {
  user: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  register: (body: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!(await tokenStore.get())) return setUser(null);
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = async (u: string, p: string) => {
    const { token } = await api.login(u, p);
    await tokenStore.set(token);
    const me = await api.me();
    if (me.role !== "READER") {
      await tokenStore.clear();
      throw new Error("Ứng dụng dành cho bạn đọc. Thủ thư vui lòng dùng trang web quản trị.");
    }
    setUser(me);
  };

  const register = async (body: Record<string, unknown>) => {
    const { token } = await api.register(body);
    await tokenStore.set(token);
    setUser(await api.me());
  };

  const logout = async () => {
    await tokenStore.clear();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth phải nằm trong AuthProvider");
  return c;
}
