import { AlarmClock, BarChart, Calendar, CalendarClock } from "lucide-react"
import { useIntl } from "react-intl"
import { Link } from "react-router-dom"
import { PageLayout } from "../components/pageLayout"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"

export default function RulesAndSchedules() {
    const intl = useIntl()

    return (
        <PageLayout
            title={intl.formatMessage({ id: 'rules.title' })}
            description={intl.formatMessage({ id: 'rules.description' })}
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'rules.serviceHours' })}</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{intl.formatMessage({ id: 'rules.queueSchedules' })}</div>
                        <p className="text-xs text-muted-foreground mt-1">{intl.formatMessage({ id: 'rules.queueSchedulesDescription' })}</p>
                        <Button className="w-full mt-4" asChild>
                            <Link to="/rules-schedules/queue-schedules">{intl.formatMessage({ id: 'rules.configureSchedules' })}</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'rules.callbackThreshold' })}</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{intl.formatMessage({ id: 'rules.onOff' })}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {intl.formatMessage({ id: 'rules.callbackThresholdDescription' })}
                        </p>
                        <Button className="w-full mt-4" asChild>
                            <Link to="/rules-schedules/general-configuration">{intl.formatMessage({ id: 'rules.configureThreshold' })}</Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'rules.callbackOutsideBusinessHours' })}</CardTitle>
                        <AlarmClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{intl.formatMessage({ id: 'rules.availabilityConfiguration' })}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {intl.formatMessage({ id: 'rules.businessHoursDescription' })}
                        </p>
                        <Button className="w-full mt-4" asChild>
                            <Link to="/rules-schedules/business-hours">{intl.formatMessage({ id: 'rules.configureAvailability' })}</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'rules.holidayCalendar' })}</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{intl.formatMessage({ id: 'rules.holidays' })}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {intl.formatMessage({ id: 'rules.holidayDescription' })}
                        </p>
                        <Button className="w-full mt-4" asChild>
                            <Link to="/rules-schedules/holidays">{intl.formatMessage({ id: 'rules.configureHolidays' })}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </PageLayout>
    )
}
