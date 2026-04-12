import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SITE_LANGUAGES = [
  { code: 'en',    name: 'English',    flag: '🇬🇧' },
  { code: 'pt-BR', name: 'Português',  flag: '🇧🇷' },
  { code: 'es',    name: 'Español',    flag: '🇪🇸' },
  { code: 'fr',    name: 'Français',   flag: '🇫🇷' },
  { code: 'ar',    name: 'العربية',    flag: '🇦🇪' },
] as const;

export type SiteLanguageCode = typeof SITE_LANGUAGES[number]['code'];

/** Map short DB codes (stored in nfs_operators.default_language) to i18next locale codes */
export function dbLangToLocale(dbLang: string): string {
  if (dbLang === 'pt') return 'pt-BR';
  return dbLang;
}

export function NfsLanguageSelector() {
  const { i18n } = useTranslation();
  const current = SITE_LANGUAGES.find(l => i18n.language?.startsWith(l.code.split('-')[0]))?.code ?? 'en';

  return (
    <Select
      value={current}
      onValueChange={(v) => i18n.changeLanguage(v)}
    >
      <SelectTrigger data-feature="NFSTAY__LANGUAGE" className="w-auto h-8 gap-1 border-none bg-transparent text-sm font-medium px-2 focus:ring-0">
        <span>{SITE_LANGUAGES.find(l => l.code === current)?.flag ?? '🇬🇧'}</span>
        <span className="hidden sm:inline text-xs">{SITE_LANGUAGES.find(l => l.code === current)?.name ?? 'EN'}</span>
      </SelectTrigger>
      <SelectContent>
        {SITE_LANGUAGES.map(l => (
          <SelectItem key={l.code} value={l.code}>
            <span className="mr-2">{l.flag}</span>{l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
