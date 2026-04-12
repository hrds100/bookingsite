import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGUAGES = [
  { code: 'en',    name: 'English',    flag: '🇬🇧' },
  { code: 'pt-BR', name: 'Português',  flag: '🇧🇷' },
] as const;

export function NfsLanguageSelector() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('pt') ? 'pt-BR' : 'en';

  return (
    <Select
      value={current}
      onValueChange={(v) => i18n.changeLanguage(v)}
    >
      <SelectTrigger data-feature="NFSTAY__LANGUAGE" className="w-auto h-8 gap-1 border-none bg-transparent text-sm font-medium px-2 focus:ring-0">
        <span>{LANGUAGES.find(l => l.code === current)?.flag ?? '🇬🇧'}</span>
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
