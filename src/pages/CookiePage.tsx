import { useWhiteLabel } from "@/contexts/WhiteLabelContext";
import { useNfsLegalPage, useNfsLegalProtectedBlock } from "@/hooks/useNfsLegalPage";
import { NfsLegalPageLayout } from "@/components/nfs/NfsLegalPageLayout";

export default function CookiePage() {
  const { operator, isWhiteLabel } = useWhiteLabel();
  const operatorId = isWhiteLabel ? operator?.id : undefined;

  const { data: content = "", isLoading } = useNfsLegalPage("cookie", operatorId);
  const { data: protectedBlock = "" } = useNfsLegalProtectedBlock("cookie");

  const brand = isWhiteLabel && operator?.brand_name ? operator.brand_name : "nfstay";
  const title = `${brand} Cookie Policy`;

  return (
    <div data-feature="NFSTAY__COOKIE">
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
