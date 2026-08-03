import React from 'react'

export function AmazonConnectThemeWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="amazon-connect-theme">
            {children}
        </div>
    )
}
