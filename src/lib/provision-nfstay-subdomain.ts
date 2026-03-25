import { supabase } from "@/lib/supabase";

/** Calls Edge Function to register `{subdomain}.nfstay.app` on the Vercel bookingsite project. */
export async function provisionOperatorNfstaySubdomain(): Promise<void> {
  const { error } = await supabase.functions.invoke(
    "nfs-provision-nfstay-subdomain",
    { method: "POST", body: {} },
  );
  if (error) {
    console.warn("[provision-nfstay-subdomain]", error.message);
  }
}
