import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://nnnsssxxxd-coder.github.io",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost"
]);
function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Vary": "Origin",
    ...(allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}
function reply(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, service, { auth: { persistSession: false } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { error: "Metodo non supportato." }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return reply(req, { error: "Accesso non autorizzato." }, 401);
    const caller = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false }
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) return reply(req, { error: "Sessione non valida. Accedi di nuovo." }, 401);

    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("id,username,display_name,role,active,deleted,matricola")
      .eq("id", user.id).maybeSingle();
    if (profileError) return reply(req, { error: "Impossibile leggere il profilo." }, 500);
    if (!profile || !profile.active || profile.deleted) return reply(req, { error: "Account sospeso o disattivato." }, 403);
    let body: any = {};
    try { body = await req.json(); } catch { return reply(req, { error: "Richiesta non valida." }, 400); }
    const branch=String(body.service_branch??"");
    if(!["carabinieri","finanza"].includes(branch))return reply(req,{error:"Corpo selezionato non valido."},400);
    const {data:membership}=await admin.from("profile_memberships").select("role,initial_rank,matricola").eq("user_id",user.id).eq("service_branch",branch).eq("active",true).maybeSingle();
    if(!membership)return reply(req,{error:"Non sei abilitato per questo Corpo."},403);
    profile.service_branch=branch;profile.initial_rank=membership.initial_rank;profile.role=membership.role;profile.matricola=membership.matricola||profile.matricola;

    if (body.action === "status") {
      const [progress, membership, completed] = await Promise.all([
        admin.from("progress").select("payload").eq("user_id", user.id).eq("service_branch",branch).maybeSingle(),
        admin.from("department_memberships").select("department_id,exp,rank,quiz_count,correct_answers,perfect_streak,history").eq("user_id", user.id).eq("service_branch",branch).maybeSingle(),
        admin.from("game_mission_completions").select("mission_id,exp_awarded,completed_at").eq("user_id", user.id).eq("service_branch",branch)
      ]);
      if (progress.error || membership.error || completed.error) return reply(req, { error: "Impossibile sincronizzare la carriera." }, 500);
      let department = null;
      let command = null;
      if (membership.data?.department_id) {
        const [dept, commanders] = await Promise.all([
          admin.from("department_catalog").select("id,name,description").eq("id", membership.data.department_id).eq("service_branch",branch).maybeSingle(),
          admin.from("department_commanders").select("commander_user_id,vice_user_id").eq("department_id", membership.data.department_id).eq("service_branch",branch).maybeSingle()
        ]);
        if (dept.error || commanders.error) return reply(req, { error: "Impossibile leggere il reparto." }, 500);
        department = dept.data;
        command = commanders.data ? {
          is_commander: commanders.data.commander_user_id === user.id,
          is_vice_commander: commanders.data.vice_user_id === user.id
        } : null;
      }
      const payload = progress.data?.payload ?? { rank: profile.initial_rank ?? 0, exp: 0, totalExp: 0 };
      return reply(req, {
        profile,
        progress: { ...payload, rank: Math.max(Number(payload.rank) || 0, Number(profile.initial_rank) || 0) },
        department_membership: membership.data,
        department,
        command,
        completed_missions: completed.data ?? []
      });
    }

    if (body.action === "mission_complete") {
      const missionId = String(body.mission_id ?? "");
      if (!["academy_orientation", "community_assistance", "missing_person", "safe_patrol"].includes(missionId)) {
        return reply(req, { error: "Missione non riconosciuta." }, 400);
      }
      const { data, error } = await admin.rpc("complete_game_mission", {
        p_user_id: user.id,
        p_mission_id: missionId,
        p_service_branch: branch
      });
      if (error) {
        console.error("game-engine mission completion:", error.message);
        return reply(req, { error: "Non è stato possibile registrare la missione. Riprova." }, 500);
      }
      return reply(req, data);
    }

    return reply(req, { error: "Azione non riconosciuta." }, 400);
  } catch (error) {
    console.error("game-engine:", error);
    return reply(req, { error: "Errore temporaneo del simulatore." }, 500);
  }
});
