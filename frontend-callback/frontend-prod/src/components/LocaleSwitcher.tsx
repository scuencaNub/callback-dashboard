import { Globe } from "lucide-react"
import { useTranslation } from "./TranslationProvider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"

export function LocaleSwitcher() {
    const { locale, setLocale, availableLocales } = useTranslation()

    return (
        <Select value={locale} onValueChange={(val) => setLocale(val as any)}>
            <SelectTrigger className="w-full justify-start gap-2">
                <Globe className="h-4 w-4" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {availableLocales.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code}>
                        {loc.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
