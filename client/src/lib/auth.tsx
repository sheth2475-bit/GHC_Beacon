import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  companyId: number | null;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isExecutive: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { name, email, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const resolvedUser = user ?? null;
  const isAdmin = resolvedUser?.role === "admin";
  const isExecutive = resolvedUser?.role === "executive";

  return (
    <AuthContext.Provider
      value={{
        user: resolvedUser,
        isLoading,
        isAdmin,
        isExecutive,
        login: async (email, password) => { await loginMutation.mutateAsync({ email, password }); },
        register: async (name, email, password) => { await registerMutation.mutateAsync({ name, email, password }); },
        logout: async () => { await logoutMutation.mutateAsync(); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
