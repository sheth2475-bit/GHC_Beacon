import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface PlatformOwner {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface OwnerAuthContextType {
  owner: PlatformOwner | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const OwnerAuthContext = createContext<OwnerAuthContextType | null>(null);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<PlatformOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/owner/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => setOwner(data))
      .catch(() => setOwner(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/owner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    setOwner(data);
    navigate("/owner/dashboard");
  };

  const logout = async () => {
    await fetch("/api/owner/logout", { method: "POST", credentials: "include" });
    setOwner(null);
    navigate("/owner/login");
  };

  return (
    <OwnerAuthContext.Provider value={{ owner, isLoading, login, logout }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used within OwnerAuthProvider");
  return ctx;
}
