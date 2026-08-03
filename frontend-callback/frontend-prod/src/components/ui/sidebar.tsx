import { Slot } from "@radix-ui/react-slot"
import * as React from "react"
import { cn } from "../../lib/utils"

type SidebarContextType = {
    collapsed: boolean
    toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
    const ctx = React.useContext(SidebarContext)
    if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
    return ctx
}

const Sidebar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-screen w-64 shrink-0 flex-col overflow-auto bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ease-linear group-data-[state=collapsed]/sidebar-wrapper:w-0 group-data-[state=collapsed]/sidebar-wrapper:opacity-0 group-data-[state=collapsed]/sidebar-wrapper:pointer-events-none",
            className
        )}
        data-sidebar="sidebar"
        {...props}
    />
))
Sidebar.displayName = "Sidebar"

const SidebarContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto", className)}
        data-sidebar="content"
        {...props}
    />
))
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
        data-sidebar="group"
        {...props}
    />
))
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("w-full text-sm", className)}
        data-sidebar="group-content"
        {...props}
    />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
    HTMLUListElement,
    React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
    <ul
        ref={ref}
        className={cn("flex w-full min-w-0 flex-col gap-1", className)}
        data-sidebar="menu"
        {...props}
    />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
    HTMLLIElement,
    React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
    <li
        ref={ref}
        className={cn("group/menu-item relative", className)}
        data-sidebar="menu-item"
        {...props}
    />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        asChild?: boolean
    }
>(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
        <Comp
            ref={ref}
            className={cn(
                "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
                className
            )}
            data-sidebar="menu-button"
            {...props}
        />
    )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuSub = React.forwardRef<
    HTMLUListElement,
    React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
    <ul
        ref={ref}
        className={cn(
            "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
            className
        )}
        data-sidebar="menu-sub"
        {...props}
    />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef<
    HTMLLIElement,
    React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
    <li
        ref={ref}
        className={cn("group/menu-sub-item", className)}
        {...props}
    />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        asChild?: boolean
    }
>(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "a"
    return (
        <Comp
            ref={ref}
            className={cn(
                "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-foreground",
                className
            )}
            data-sidebar="menu-sub-button"
            {...props}
        />
    )
})
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarRail = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()
    return (
        <button
            ref={ref}
            onClick={toggleSidebar}
            className={cn(
                "absolute inset-y-0 right-0 z-20 w-3 -translate-x-px bg-transparent hover:bg-sidebar/10 focus-visible:ring-2",
                className
            )}
            data-sidebar="rail"
            aria-label="Toggle sidebar"
            {...props}
        />
    )
})
SidebarRail.displayName = "SidebarRail"

const SidebarProvider = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
    const [collapsed, setCollapsed] = React.useState(false)
    const toggleSidebar = () => setCollapsed((v) => !v)
    return (
        <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
            <div
                ref={ref}
                data-state={collapsed ? "collapsed" : "expanded"}
                className={cn("group/sidebar-wrapper flex h-screen w-full overflow-hidden bg-sidebar", className)}
                {...props}
            />
        </SidebarContext.Provider>
    )
})
SidebarProvider.displayName = "SidebarProvider"

const SidebarInset = React.forwardRef<
    HTMLElement,
    React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
    <main
        ref={ref as any}
        className={cn(
            "flex min-h-0 flex-1 flex-col overflow-auto gap-4 p-4 bg-sidebar",
            className
        )}
        {...props}
    />
))
SidebarInset.displayName = "SidebarInset"

export {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail
}

