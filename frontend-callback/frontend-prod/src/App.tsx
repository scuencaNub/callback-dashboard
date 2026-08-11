import { Route, Routes } from 'react-router-dom'
import { AmazonConnectThemeWrapper } from './components/amazonConnectThemeWrapper'
import { AppSidebar } from './components/appSidebar'
import { KeyProvider } from './components/keyProvider'
import { LayoutWrapper } from './components/LayoutWrapper'
import { TranslationProvider } from './components/TranslationProvider'
import { SidebarInset, SidebarProvider } from './components/ui/sidebar'
import AuthCallback from './pages/AuthCallback'
import BusinessHours from './pages/BusinessHours'
import CallbackConcurrencyMetrics from './pages/CallbackConcurrencyMetrics'
import CallbackHistoricalSummary from './pages/CallbackHistoricalSummary'
import CallbacksInProgress from './pages/CallbacksInProgress'
import ConnectContactsSearch from './pages/ConnectContactsSearch'
import ConnectContactsReportByDate from './pages/ConnectContactsReportByDate'
import Dashboard from './pages/Dashboard'
import Holidays from './pages/Holidays'
import LoggedOut from './pages/LoggedOut'
import QueueConfiguration from './pages/QueueConfiguration'
import QueueGroupBehavior from './pages/QueueGroupBehavior'
import QueueSchedules from './pages/QueueSchedules'
import RulesAndSchedules from './pages/RulesAndSchedules'
import Threshold from './pages/Threshold'
import CallbackNotAcceptedDetail from './pages/CallbackNotAcceptedDetail'
import BlockedPhoneNumbers from './pages/BlockedAnis'

function App() {
  return (
    <LayoutWrapper>
      <AmazonConnectThemeWrapper>
        <KeyProvider>
          <TranslationProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/rules-schedules" element={<RulesAndSchedules />} />
                  <Route path="/rules-schedules/queue-schedules" element={<QueueSchedules />} />
                  <Route path="/rules-schedules/business-hours" element={<BusinessHours />} />
                  <Route path="/rules-schedules/holidays" element={<Holidays />} />
                  <Route path="/rules-schedules/general-configuration" element={<Threshold />} />
                  <Route path="/callbacks" element={<CallbacksInProgress />} />
                  <Route path="/callbacks/retries" element={<QueueConfiguration />} />
                  <Route path="/callbacks/queue-group-behavior" element={<QueueGroupBehavior />} />
                  <Route path="/connect-contacts/search" element={<ConnectContactsSearch />} />
                  <Route path="/connect-contacts/report-by-date" element={<ConnectContactsReportByDate />} />
                  <Route path="/concurrency-metrics" element={<CallbackConcurrencyMetrics />} />
                  <Route path="/historical-summary" element={<CallbackHistoricalSummary />} />
                  <Route path="/not-accepted-detail" element={<CallbackNotAcceptedDetail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/blocked-anis" element={<BlockedPhoneNumbers />} />
                  <Route path="/logged-out" element={<LoggedOut />} />
                </Routes>
              </SidebarInset>
            </SidebarProvider>
          </TranslationProvider>
        </KeyProvider>
      </AmazonConnectThemeWrapper>
    </LayoutWrapper>
  )
}

export default App
