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
 * Replace [Operator Name] and [Operator Email] placeholders with real operator data.
 */
function interpolate(text: string, name: string, email: string): string {
  return text
    .replace(/\[Operator Name\]/g, name)
    .replace(/\[Operator Email Address\]/g, email)
    .replace(/\[Operator Email\]/g, email);
}

/**
 * Shared layout for Privacy, Terms, and Cookie legal pages.
 * - On nfstay.app: shows nfstay logo + platform content
 * - On operator white-label: shows operator brand name + operator content
 * Renders markdown content + optional admin-injected protected block.
 */
export function NfsLegalPageLayout({ title, updatedAt, content, protectedBlock, loading }: Props) {
  const { operator, isWhiteLabel } = useWhiteLabel();

  // Replace placeholders with real operator values before rendering
  const operatorName = (isWhiteLabel && operator?.brand_name) ? operator.brand_name : "nfstay";
  const operatorEmail = (isWhiteLabel && operator?.contact_email) ? operator.contact_email : "hello@nfstay.com";
  const resolvedContent = interpolate(content, operatorName, operatorEmail);
  const resolvedProtectedBlock = protectedBlock ? interpolate(protectedBlock, operatorName, operatorEmail) : "";

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
            <ReactMarkdown>{resolvedContent}</ReactMarkdown>

            {/* Admin-injected protected block — visually separated */}
            {resolvedProtectedBlock && (
              <div className="mt-10 pt-8 border-t border-border">
                <ReactMarkdown>{resolvedProtectedBlock}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
