"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserRole, getDefaultRouteForRole } from "@/config/navigation";
import { loginUser, registerSeller, getStoredUser, LoginCredentials, RegisterSellerData, UserMembership } from "@/lib/authApi";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  platformRole?: string;
  memberships?: UserMembership[];
}

interface AuthContextType {
  user: AuthenticatedUser | null;
  token: string | null;
  currentRole: UserRole;
  activeTenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterSellerData) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  switchTenant: (tenantId: string) => void;
}

const DEFAULT_DEMO_USER: AuthenticatedUser = {
  id: "usr_priya_sharma",
  name: "Priya Sharma",
  email: "priya@mitticraft.com",
  phone: "+91 98765 43210",
  platformRole: "USER",
  memberships: [
    {
      id: "mem_mitti_1",
      tenantId: "tenant_mitti_craft",
      role: "STORE_OWNER",
      status: "ACTIVE",
    },
  ],
};

function resolveRoleForUser(usr: AuthenticatedUser | null): UserRole {
  if (!usr) return "CUSTOMER";
  if (usr.platformRole === "SUPER_ADMIN") return "SUPER_ADMIN";
  if (usr.memberships && usr.memberships.length > 0) {
    const activeMem = usr.memberships.find((m) => m.status === "ACTIVE") || usr.memberships[0];
    if (activeMem.role === "STORE_OWNER") return "STORE_OWNER";
    if (activeMem.role === "STORE_MANAGER") return "STORE_MANAGER";
    if (activeMem.role === "STORE_STAFF") return "STORE_STAFF";
  }
  return "CUSTOMER";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<AuthenticatedUser | null>(() => {
    if (typeof window === "undefined") return DEFAULT_DEMO_USER;
    try {
      const stored = getStoredUser();
      return stored || DEFAULT_DEMO_USER;
    } catch {
      return DEFAULT_DEMO_USER;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("gaushilp_auth_token");
    } catch {
      return null;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    if (typeof window === "undefined") return "STORE_OWNER";
    try {
      const savedRole = localStorage.getItem("gaushilp_active_role") as UserRole | null;
      if (savedRole) return savedRole;
      const storedUser = getStoredUser();
      return resolveRoleForUser(storedUser || DEFAULT_DEMO_USER);
    } catch {
      return "STORE_OWNER";
    }
  });

  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    if (typeof window === "undefined") return "tenant_mitti_craft";
    try {
      const storedUser = getStoredUser();
      return storedUser?.memberships?.[0]?.tenantId || "tenant_mitti_craft";
    } catch {
      return "tenant_mitti_craft";
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const session = await loginUser(credentials);
      setUser(session.user);
      setToken(session.token);

      const resolvedRole = resolveRoleForUser(session.user);
      setCurrentRole(resolvedRole);
      localStorage.setItem("gaushilp_active_role", resolvedRole);

      if (session.user.memberships?.[0]) {
        setActiveTenantId(session.user.memberships[0].tenantId);
      }

      const destination = getDefaultRouteForRole(resolvedRole);
      router.push(destination);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterSellerData) => {
    setIsLoading(true);
    try {
      const session = await registerSeller(data);
      setUser(session.user);
      setToken(session.token);
      setCurrentRole("STORE_OWNER");
      localStorage.setItem("gaushilp_active_role", "STORE_OWNER");

      if (session.user.memberships?.[0]) {
        setActiveTenantId(session.user.memberships[0].tenantId);
      }

      router.push("/seller/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("gaushilp_auth_token");
      localStorage.removeItem("gaushilp_auth_user");
      localStorage.removeItem("gaushilp_active_role");
    } catch {
      // Ignore
    }

    setUser(null);
    setToken(null);
    setCurrentRole("CUSTOMER");
    setActiveTenantId(null);

    // Redirect to login
    router.push("/login");
  }, [router]);

  const switchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    try {
      localStorage.setItem("gaushilp_active_role", newRole);
    } catch {
      // Ignore
    }
  };

  const switchTenant = (tenantId: string) => {
    setActiveTenantId(tenantId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentRole,
        activeTenantId,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchRole,
        switchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext: AuthContextType = {
  user: null,
  token: null,
  currentRole: "CUSTOMER",
  activeTenantId: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  switchRole: () => {},
  switchTenant: () => {},
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
