import { getLoggedUserName } from "../lib/auth-helpers"
import {
    AlarmClock,
    BarChart,
    BarChart3,
    Calendar,
    CalendarClock,
    Clock,
    FileText,
    Home,
    LogOut,
    PhoneCall,
    RefreshCw,
    Search,
    SplitSquareVertical,
    XCircle
} from "lucide-react"
import type * as React from "react"
import { useEffect, useState } from "react"
import { useIntl } from "react-intl"
import { Link } from "react-router-dom"
import { useAuth } from "./auth/AuthProvider"
import { LocaleSwitcher } from "./LocaleSwitcher"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail
} from "./ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const intl = useIntl()
    const { signOut } = useAuth()
    const showLogout = import.meta.env.VITE_SHOW_LOGOUT !== 'false'
    const [loggedUserName, setLoggedUserName] = useState('')

    useEffect(() => {
        let cancelled = false

        const loadLoggedUser = async () => {
            try {
                const userName = await getLoggedUserName()
                if (!cancelled) {
                    setLoggedUserName(userName)
                }
            } catch {
                if (!cancelled) {
                    setLoggedUserName('Unknown user')
                }
            }
        }

        void loadLoggedUser()

        return () => {
            cancelled = true
        }
    }, [])

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    return (
        <Sidebar {...props}>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{loggedUserName || 'Unknown user'}</span>
                            </div>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <LocaleSwitcher />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>
                <SidebarGroup>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild className="sidebar-menu-button">
                                <Link to="/" className="text-black">
                                    <Home className="size-4 text-black" />
                                    <span>{intl.formatMessage({ id: 'sidebar.dashboard' })}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                    <SidebarGroupContent >
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="sidebar-menu-button">
                                    <Link to="/rules-schedules" className="text-black">
                                        <Clock className="size-4 text-black" />
                                        <span>{intl.formatMessage({ id: 'sidebar.rulesAndSchedules' })}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button pointer-event: none">
                                            <Link to="/rules-schedules/queue-schedules" className="text-black">
                                                <CalendarClock className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.queueSchedules' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    {/* <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/rules-schedules/end-of-day" className="text-black">
                                                <Clock className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.endOfDayLogic' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem> */}
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/rules-schedules/business-hours" className="text-black">
                                                <AlarmClock className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.businessHours' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/rules-schedules/holidays" className="text-black">
                                                <Calendar className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.holidays' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button h-10">
                                            <Link to="/rules-schedules/general-configuration" className="text-black">
                                                <BarChart className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.thresholdOnOff' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="sidebar-menu-button">
                                    <Link to="#" className="text-black">
                                        <PhoneCall className="size-4 text-black" />
                                        <span>{intl.formatMessage({ id: 'sidebar.callbacksInProgress' })}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button h-10">
                                            <Link to="/callbacks/retries" className="text-black">
                                                <RefreshCw className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.queueConfiguration' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button h-10">
                                            <Link to="/callbacks/queue-group-behavior" className="text-black">
                                                <SplitSquareVertical className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.queueGroupBehavior' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="sidebar-menu-button">
                                    <Link to="#" className="text-black">
                                        <FileText className="size-4 text-black" />
                                        <span>{intl.formatMessage({ id: 'sidebar.reports' })}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <SidebarMenuSub>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/connect-contacts/search" className="text-black">
                                                <Search className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.searchContacts' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/connect-contacts/report-by-date" className="text-black">
                                                <FileText className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.reportByDate', defaultMessage: 'Report by date' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/concurrency-metrics" className="text-black">
                                                <BarChart3 className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.concurrencyMetrics' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/historical-summary" className="text-black">
                                                <BarChart3 className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.historicalSummary' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                    <SidebarMenuSubItem>
                                        <SidebarMenuSubButton asChild className="sidebar-menu-sub-button">
                                            <Link to="/not-accepted-detail" className="text-black">
                                                <XCircle className="size-4 mr-2 text-black" />
                                                {intl.formatMessage({ id: 'sidebar.notAccepted' })}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                </SidebarMenuSub>
                            </SidebarMenuItem>
                           {/* BLOCKED ANIS */}
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild className="sidebar-menu-button">
                                    <Link to="/blocked-anis" className="text-black">
                                        <Home className="size-4 text-black" />
                                        <span>{intl.formatMessage({ id: 'sidebar.blockedAnis' })}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem> 
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                {showLogout && (
                    <SidebarGroup>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={handleLogout}
                                    className="sidebar-menu-button text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <LogOut className="size-4" />
                                    <span>{intl.formatMessage({ id: 'sidebar.logout', defaultMessage: 'Logout' })}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroup>
                )}
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
