import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useNfsOperator } from "./useNfsOperator";

const SUPABASE_CONFIGURED = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export type LegalPageType = "privacy" | "terms" | "cookie";

export interface NfsLegalPage {
  id: string;
  owner_type: "operator" | "platform";
  owner_id: string;
  page_type: LegalPageType;
  content: string;
  content_translations: Record<string, string>;
  updated_at: string;
}

export interface NfsLegalProtectedBlock {
  id: string;
  page_type: LegalPageType;
  content: string;
  active: boolean;
  updated_at: string;
}

/**
 * Fetch the resolved content for a legal page.
 *
 * Resolution order (highest wins):
 *   1. Operator's own custom content (owner_type='operator', owner_id=operatorId)
 *   2. Operator default template   (owner_type='operator', owner_id='default')
 *   3. Platform content            (owner_type='platform',  owner_id='nfstay')
 *
 * When operatorId is null/undefined (main nfstay.app), returns platform content.
 */
/**
 * Pick the best content for the viewer's language.
 *
 * `content` is stored in `operatorDefaultLang` (defaults to 'en').
 * Resolution:
 *   1. If viewer's lang matches the operator's default → return content directly.
 *   2. Try exact viewer lang from translations.
 *   3. Try base lang (e.g. 'pt' from 'pt-BR') from translations.
 *   4. If operator's default isn't English, try 'en' from translations as universal bridge.
 *   5. Fall back to content (operator's default language).
 */
function resolveContent(
  content: string,
  translations: Record<string, string> | null | undefined,
  lang?: string,
  operatorDefaultLang?: string | null,
): string {
  // Normalize operator default: DB stores 'pt', locale is 'pt-BR'
  const defaultLocale = operatorDefaultLang === 'pt' ? 'pt-BR' : (operatorDefaultLang ?? 'en');
  const defaultBase = defaultLocale.split('-')[0];

  if (!lang) return content;
  const viewerBase = lang.split('-')[0];

  // Viewer's language matches operator's default → content is already correct
  if (lang === defaultLocale || viewerBase === defaultBase) return content;

  // Try exact viewer language
  if (translations?.[lang]) return translations[lang];
  // Try base viewer language (e.g. 'pt' from 'pt-BR')
  if (viewerBase !== lang && translations?.[viewerBase]) return translations[viewerBase];
  // Try English as universal bridge when operator's default isn't English
  if (defaultBase !== 'en' && translations?.['en']) return translations['en'];

  return content; // last resort: operator's default language
}

export function useNfsLegalPage(pageType: LegalPageType, operatorId?: string | null, lang?: string, operatorDefaultLang?: string | null) {
  return useQuery({
    queryKey: ["nfs-legal-page", pageType, operatorId ?? "platform", lang ?? "en", operatorDefaultLang ?? "en"],
    queryFn: async (): Promise<string> => {
      if (!SUPABASE_CONFIGURED) return "";

      if (operatorId) {
        // 1. Operator's own custom content
        const { data: custom } = await supabase
          .from("nfs_legal_pages")
          .select("content, content_translations")
          .eq("owner_type", "operator")
          .eq("owner_id", operatorId)
          .eq("page_type", pageType)
          .maybeSingle();

        if (custom?.content) {
          return resolveContent(
            custom.content,
            custom.content_translations as Record<string, string> | null,
            lang,
            operatorDefaultLang,
          );
        }

        // 2. Operator default template
        const { data: defaultOp } = await supabase
          .from("nfs_legal_pages")
          .select("content, content_translations")
          .eq("owner_type", "operator")
          .eq("owner_id", "default")
          .eq("page_type", pageType)
          .maybeSingle();

        if (defaultOp?.content) {
          return resolveContent(
            defaultOp.content,
            (defaultOp as any).content_translations as Record<string, string> | null,
            lang,
          );
        }
      }

      // 3. Platform content — final fallback (always English)
      const { data: platform } = await supabase
        .from("nfs_legal_pages")
        .select("content, content_translations")
        .eq("owner_type", "platform")
        .eq("owner_id", "nfstay")
        .eq("page_type", pageType)
        .maybeSingle();

      if (platform?.content) {
        return resolveContent(
          platform.content,
          (platform as any).content_translations as Record<string, string> | null,
          lang,
        );
      }

      return "";
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Fetch the admin-controlled protected block for a page type.
 * Returns empty string if none or not active.
 */
export function useNfsLegalProtectedBlock(pageType: LegalPageType) {
  return useQuery({
    queryKey: ["nfs-legal-protected-block", pageType],
    queryFn: async (): Promise<string> => {
      if (!SUPABASE_CONFIGURED) return "";
      const { data } = await supabase
        .from("nfs_legal_protected_blocks")
        .select("content")
        .eq("page_type", pageType)
        .eq("active", true)
        .maybeSingle();
      return data?.content ?? "";
    },
    staleTime: 10 * 60_000,
  });
}

/**
 * For operator settings — fetch the operator's own saved content (or empty string).
 */
export function useNfsOperatorLegalPage(pageType: LegalPageType) {
  const { data: operator } = useNfsOperator();
  const operatorId = operator?.id;

  return useQuery({
    queryKey: ["nfs-operator-legal-page", pageType, operatorId],
    queryFn: async (): Promise<{ content: string; content_translations: Record<string, string> }> => {
      if (!SUPABASE_CONFIGURED || !operatorId) return { content: "", content_translations: {} };
      const { data } = await supabase
        .from("nfs_legal_pages")
        .select("content, content_translations")
        .eq("owner_type", "operator")
        .eq("owner_id", operatorId)
        .eq("page_type", pageType)
        .maybeSingle();
      return {
        content: data?.content ?? "",
        content_translations: (data?.content_translations as Record<string, string>) ?? {},
      };
    },
    enabled: !!operatorId,
    staleTime: 60_000,
  });
}

/**
 * Upsert operator's own legal page content.
 */
export function useNfsOperatorLegalPageUpdate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: operator } = useNfsOperator();

  return useMutation({
    mutationFn: async ({ pageType, content, content_translations }: { pageType: LegalPageType; content: string; content_translations?: Record<string, string> }) => {
      if (!SUPABASE_CONFIGURED || !user || !operator) throw new Error("Not configured");

      const { error } = await supabase
        .from("nfs_legal_pages")
        .upsert(
          {
            owner_type: "operator",
            owner_id: operator.id,
            page_type: pageType,
            content,
            content_translations: content_translations ?? {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "owner_type,owner_id,page_type" }
        );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["nfs-legal-page", variables.pageType] });
      void queryClient.invalidateQueries({ queryKey: ["nfs-operator-legal-page", variables.pageType] });
    },
  });
}
