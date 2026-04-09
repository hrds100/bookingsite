import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { useNfsLegalPage, useNfsLegalProtectedBlock } from "@/hooks/useNfsLegalPage";
import { NfsLegalPageLayout } from "@/components/nfs/NfsLegalPageLayout";

export default function TermsPage() {
  const { operator, isWhiteLabel } = useWhiteLabel();
  const operatorId = isWhiteLabel ? operator?.id : undefined;

  const { data: content = "", isLoading } = useNfsLegalPage("terms", operatorId);
  const { data: protectedBlock = "" } = useNfsLegalProtectedBlock("terms");

  const brand = isWhiteLabel && operator?.brand_name ? operator.brand_name : "nfstay";
  const title = `${brand} Terms and Conditions`;

  return (
    <div data-feature="NFSTAY__TERMS">
      <NfsLegalPageLayout
        title={title}
        updatedAt="April 2026"
        content={content}
        protectedBlock={protectedBlock}
        loading={isLoading}
      />
    </div>
  );
}
