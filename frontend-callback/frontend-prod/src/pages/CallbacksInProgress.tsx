import { useIntl } from "react-intl"
import { PageLayout } from "../components/pageLayout"

export default function CallbacksInProgress() {
    const intl = useIntl()

    return (
        <PageLayout
            title={intl.formatMessage({ id: 'sidebar.callbacksInProgress' })}
            description="Manage callbacks in progress"
        >
            <div className="text-center py-8">
                <p className="text-muted-foreground"></p>
            </div>
        </PageLayout>
    )
}
