import { PanelLeft } from 'lucide-react'
import React from 'react'
import { useSidebar } from './ui/sidebar'

interface PageLayoutProps {
    title: string
    description?: string
    children: React.ReactNode
}

export function PageLayout({ title, description = "", children }: PageLayoutProps) {
    const { toggleSidebar } = useSidebar()
    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
                <button
                    aria-label="Toggle sidebar"
                    onClick={toggleSidebar}
                    className="inline-flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
                >
                    <PanelLeft className="h-4 w-4" />
                </button>
                <h1 className="text-2xl font-bold text-primary">{title}</h1>
            </div>
            {description && <p className="text-muted-foreground">{description}</p>}
            {children}
        </div>
    )
}
