import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const VERCEL_TOKEN = Deno.env.get("VERCEL_TOKEN") ?? "";
const VERCEL_PROJECT_ID = Deno.env.get("VERCEL_PROJECT_ID") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405, headers: CORS });

  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    return new Response(
      JSON.stringify({ error: "VERCEL_TOKEN or VERCEL_PROJECT_ID secret not set" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return new Response(
        JSON.stringify({ error: "domain is required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "");

    // Add domain to Vercel project
    const addRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: cleanDomain }),
      }
    );

    const addData = await addRes.json();

    // 409 = domain already exists on this project — treat as success
    if (!addRes.ok && addRes.status !== 409) {
      console.error("[nfs-vercel-domain] add failed:", addData);
      return new Response(
        JSON.stringify({ error: addData.error?.message ?? "Failed to add domain to Vercel" }),
        { status: addRes.status, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    // Fetch verification status
    const checkRes = await fetch(
      `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${cleanDomain}`,
      {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    );

    const checkData = await checkRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        domain: cleanDomain,
        verified: checkData.verified ?? false,
        verification: checkData.verification ?? [],
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nfs-vercel-domain]", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
