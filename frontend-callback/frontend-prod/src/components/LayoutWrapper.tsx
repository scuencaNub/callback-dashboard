import { Amplify } from 'aws-amplify';
import { signInWithRedirect } from 'aws-amplify/auth';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import awsconfig from '../lib/aws-exports';
import { AuthProvider, useAuth } from './auth/AuthProvider';

const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: awsconfig.Auth.Cognito.userPoolId,
            userPoolClientId: awsconfig.Auth.Cognito.userPoolClientId,
            loginWith: {
                oauth: {
                    domain: awsconfig.Auth.Cognito.loginWith.oauth.domain,
                    scopes: awsconfig.Auth.Cognito.loginWith.oauth.scopes,
                    redirectSignIn: awsconfig.Auth.Cognito.loginWith.oauth.redirectSignIn,
                    redirectSignOut: awsconfig.Auth.Cognito.loginWith.oauth.redirectSignOut,
                    responseType: awsconfig.Auth.Cognito.loginWith.oauth.responseType as "code" | "token",
                },
            },
        },
    },
} as const;

Amplify.configure(amplifyConfig);

function LayoutContent({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth()
    const location = useLocation();

    useEffect(() => {
        if (isLoading || !isAuthenticated) return;
    }, [isLoading, isAuthenticated]);

    useEffect(() => {
        if (isLoading) return;
        const pathname = location.pathname; // reemplaza a usePathname()

        // Evitar redirecciones en la ruta de callback
        if (pathname === '/auth/callback/' || pathname === '/auth/callback') return;
        if (!isAuthenticated && import.meta.env.VITE_AUTH_BYPASS !== "true") {
            // Disparar login con Hosted UI
            void signInWithRedirect();
        }
    }, [isLoading, isAuthenticated, location.pathname]);

    if (isLoading || (!isAuthenticated && (location.pathname !== '/auth/callback/' && location.pathname !== '/auth/callback'))) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando autenticación...</p>
                </div>
            </div>
        )
    }

    return <>{children}</>
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
    )
}
