import '@cloudscape-design/global-styles/index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { IntlProvider } from 'react-intl'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchInterval: 60_000,
    },
  },
})

// Messages for internationalization
const messages = {
  'dashboard.title': 'Dashboard',
  'dashboard.description': 'Management system with rules, callbacks, reports and configuration',
  'dashboard.pendingCallbacks': 'Pending Callbacks',
  'dashboard.pendingCallbacksDescription': 'Callbacks waiting to be processed',
  'dashboard.callbacksInProgress': 'In Progress',
  'dashboard.callbacksInProgressDescription': 'Callbacks currently being processed',
  'dashboard.completedCallbacks': 'Completed',
  'dashboard.completedCallbacksDescription': 'Successfully completed callbacks',
  'dashboard.failedCallbacks': 'Failed',
  'dashboard.failedCallbacksDescription': 'Callbacks that failed to process',
  'dashboard.callbackDetails': 'Callback Details',
  'dashboard.callbackDetailsDescription': 'Detailed view of all callbacks',
  'dashboard.showingResults': 'Showing {count} of {total} results',
  'dashboard.viewMoreStatistics': 'View Statistics',
  'dashboard.manageCallbacks': 'Manage Callbacks',
  'common.refresh': 'Refresh',
  'common.lastUpdate': 'Last Update',
  'common.loading': 'Loading...',
  'callbacks.searchByIdOrPhone': 'Search by ID or Phone',
  'callbacks.filterByQueue': 'Filter by Queue',
  'callbacks.filterByStatus': 'Filter by Status',
  'callbacks.allQueues': 'All Queues',
  'callbacks.allStatuses': 'All Statuses',
  'callbacks.noCallbacksFound': 'No callbacks found',
  'callbacks.id': 'ID',
  'callbacks.phone': 'Phone',
  'callbacks.queue': 'Queue',
  'callbacks.status': 'Status',
  'callbacks.timeOfRegistration': 'Registration Time',
  'callbacks.retry': 'Retry',
  'callbacks.lastUpdate': 'Last Update',
  'callbacks.scheduledDate': 'Scheduled Date',
  'callbacks.attempts': 'Attempts',
  'callbacks.agent': 'Agent',
  'status.pending': 'Pending',
  'status.inProgress': 'In Progress',
  'status.completed': 'Completed',
  'status.failed': 'Failed',
  'status.cancelled': 'Cancelled',
  'status.rescheduled': 'Rescheduled',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.rulesAndSchedules': 'Rules & Schedules',
  'sidebar.queueSchedules': 'Queue Schedules',
  'sidebar.endOfDayLogic': 'End of Day Logic',
  'sidebar.businessHours': 'Business Hours',
  'sidebar.holidays': 'Holidays',
  'sidebar.thresholdOnOff': 'General Callback Configuration',
  'sidebar.callbacksInProgress': 'Callbacks in Progress',
  'sidebar.queueConfiguration': 'Queue Configuration',
  'sidebar.queueGroupBehavior': 'Queue Group Behavior',
  'sidebar.blockedAnis': 'Blocked Phone Numbers',
  'queueGroupBehavior.title': 'Queue Group Behavior',
  'queueGroupBehavior.subtitle': 'After-threshold behavior per queue group',
  'queueGroupBehavior.col.queueGroup': 'Queue Group',
  'queueGroupBehavior.col.currentBehavior': 'Current Behavior',
  'queueGroupBehavior.col.changeTo': 'Change',
  'queueGroupBehavior.loadError': 'Failed to load queue group info.',
  'queueGroupBehavior.saveError': 'Failed to save changes.',
  'businessHours.disclaimer': 'Disclaimer: These changes will apply only for today. If you need the change for tomorrow as well, you must apply it again.',
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en" messages={messages}>
        <BrowserRouter>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </BrowserRouter>
      </IntlProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
