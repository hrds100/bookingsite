import ReactMarkdown from "react-markdown";
import { NfsLogo } from "@/components/nfs/NfsLogo";
import { useWhiteLabel } from "@/contexts/WhiteLabelContext";

interface Props {
  title: string;
  updatedAt?: string;
  content: string;
  protectedBlock?: string;
  loading?: boolean;
}

/**
 * Shared layout for Privacy, Terms, and Cookie legal pages.
 * - On nfstay.app: shows nfstay logo + platform content
 * - On operator white-label: shows operator brand name + operator content
 * Renders markdown content + optional admin-injected protected block.
 */
export function NfsLegalPageLayout({ title, updatedAt, content, protectedBlock, loading }: Props) {
  const { operator, isWhiteLabel } = useWhiteLabel();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Logo / brand header */}
        <div className="mb-8">
          {isWhiteLabel && operator ? (
            <p className="text-lg font-bold text-foreground">{operator.brand_name}</p>
          ) : (
            <NfsLogo />
          )}
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
        {updatedAt && (
          <p className="text-sm text-muted-foreground mb-10">Last updated: {updatedAt}</p>
        )}

        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-sm [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_ul]:text-sm [&_ul]:text-muted-foreground [&_li]:mt-1 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>

            {/* Admin-injected protected block — visually separated */}
            {protectedBlock && (
              <div className="mt-10 pt-8 border-t border-border">
                <ReactMarkdown>{protectedBlock}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
