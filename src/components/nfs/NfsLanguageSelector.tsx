import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NfsLanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <Select value={language} onValueChange={(v) => setLanguage(v as typeof language)}>
      <SelectTrigger data-feature="NFSTAY__LANGUAGE" className="w-auto h-8 gap-1 border-none bg-transparent text-sm font-medium px-2 focus:ring-0">
        <span>{LANGUAGES.find(l => l.code === language)?.flag ?? '🇬🇧'}</span>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(l => (
          <SelectItem key={l.code} value={l.code}>
            <span className="mr-2">{l.flag}</span>{l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
