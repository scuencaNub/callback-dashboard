"use client";
import { signOut as amplifySignOut, fetchAuthSession, signInWithRedirect } from "aws-amplify/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { config } from "../../config/env";
interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    canEdit: boolean;
    signIn: () => void;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === "true";

interface UserPermissionsResponse {
    role?: string;
    canEdit?: boolean;
}

const getSignOutRedirectUrl = (): string => {
    const currentOrigin = window.location.origin;
    const configuredSignOutUrls = (import.meta.env.VITE_REDIRECT_SIGNOUT || "")
        .split(",")
        .map((url: string) => url.trim())
        .filter(Boolean);

    const originMatch = configuredSignOutUrls.find((url: string) => {
        try {
            return new URL(url).origin === currentOrigin;
        } catch {
            return false;
        }
    });

    if (originMatch) return originMatch;
    return currentOrigin;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(AUTH_BYPASS);
    const [isLoading, setIsLoading] = useState(!AUTH_BYPASS);
    const [canEdit, setCanEdit] = useState(AUTH_BYPASS);

    useEffect(() => {
        if (AUTH_BYPASS) {
            console.warn("[AuthProvider] Auth bypass enabled — skipping Cognito");
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const { tokens } = await fetchAuthSession();

                if (!cancelled) setIsAuthenticated(!!tokens?.idToken);

                if (!cancelled && tokens?.idToken) {
                    try {
                        const idToken = tokens.idToken.toString();
                        const response = await fetch(config.permissionsUrl, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${idToken}`,
                                "Content-Type": "application/json",
                            },
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to fetch permissions: ${response.status}`);
                        }

                        const data = (await response.json()) as UserPermissionsResponse;
                        const canEditByRole = data.role?.toLowerCase() === "editor";
                        if (!cancelled) setCanEdit(Boolean(data.canEdit) || canEditByRole);

                    } catch (userError) {
                        console.warn("Could not fetch user permissions, defaulting to read-only:", userError);
                        if (!cancelled) setCanEdit(false);
                    }
                }
            } catch {
                if (!cancelled) {
                    setIsAuthenticated(false);
                    setCanEdit(false);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const signIn = () => { void signInWithRedirect(); };
    const signOut = async () => {

        try {
            await amplifySignOut({
                global: false,
                oauth: {
                    redirectUrl: getSignOutRedirectUrl(),
                },
            });
        } catch (error) {
            // Not fatal; we already cleared local tokens.
            console.warn("Amplify signOut failed (continuing):", error);
        }

    };

    const value: AuthContextType = useMemo(() => ({
        isAuthenticated,
        isLoading,
        canEdit,
        signIn,
        signOut,
    }), [isLoading, isAuthenticated, canEdit]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth debe ser usado dentro de AuthProvider");
    return ctx;
}
