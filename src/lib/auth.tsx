// Login state for the whole app, backed by Netlify Identity.
import { getUser, handleAuthCallback, logout as identityLogout, onAuthChange, type User } from "@netlify/identity";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Auth = { user: User | null; loading: boolean; logout: () => Promise<void> };

const AuthContext = createContext<Auth>({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Finishes Google sign-in redirects (the token arrives in the URL), then loads the current user.
    async function start() {
      try {
        const callback = await handleAuthCallback();
        setUser(callback?.user ?? (await getUser()));
      } catch {
        setUser(await getUser().catch(() => null));
      } finally {
        setLoading(false);
      }
    }
    start();
    return onAuthChange((_event, changed) => setUser(changed));
  }, []);

  async function logout() {
    await identityLogout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
