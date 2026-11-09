import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://nnnsssxxxd-coder.github.io",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:8100",
  "https://localhost:8100"
]);
function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
function reply(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, service, { auth: { persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req,{ error: "Metodo non consentito" }, 405);
  try {
    const body = await req.json();
    const username = String(body.username ?? "").trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const password = String(body.password ?? "");
    const serviceBranch = String(body.service_branch ?? "");
    if (!["carabinieri","finanza"].includes(serviceBranch)) return reply(req,{ error: "Seleziona il Corpo di appartenenza." }, 400);
    if (!/^[a-z0-9_-]{3,24}$/.test(username) || password.length < 1 || password.length > 128) {
      return reply(req,{ error: "Credenziali non valide." }, 400);
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, active, deleted")
      .eq("username", username)
      .maybeSingle();
    if (profileError || !profile || !profile.active || profile.deleted) {
      return reply(req,{ error: "Username o password non corretti, oppure account non attivo." }, 401);
    }
    const { data: membership, error: membershipError } = await admin
      .from("profile_memberships")
      .select("user_id")
      .eq("user_id", profile.id)
      .eq("service_branch", serviceBranch)
      .eq("active", true)
      .maybeSingle();
    if (membershipError || !membership) {
      return reply(req,{ error: "Username o password non corretti, oppure account non abilitato per questo Corpo." }, 401);
    }

    const { data: authData, error: authError } = await admin.auth.admin.getUserById(profile.id);
    const email = authData?.user?.email;
    if (authError || !email) {
      console.error("username-login: account auth non trovato", profile.id);
      return reply(req,{ error: "Account non configurato correttamente. Contatta l'istruttore." }, 503);
    }

    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return reply(req,{ error: "Username o password non corretti." }, 401);
    }
    return reply(req,{
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      }
    });
  } catch (error) {
    console.error("username-login", error);
    return reply(req,{ error: "Accesso temporaneamente non disponibile. Riprova." }, 500);
  }
});