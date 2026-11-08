import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ORIGIN = "https://nnnsssxxxd-coder.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": ORIGIN, "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, { auth: { persistSession: false } });
const SESSION_MS = 45 * 60 * 1000;
const DEPT_RANKS = ["Operatore", "Operatore scelto", "Capo squadra", "Vice comandante di squadra", "Comandante di squadra", "Ufficiale di compagnia", "Vice comandante di reparto", "Comandante di reparto"];
async function getUser(req: Request) {
  const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }, auth: { persistSession: false } });
  const { data: { user } } = await caller.auth.getUser();
  return user;
}
async function getMembership(userId: string) {
  const { data, error } = await db.from("department_memberships").select("user_id,department_id,exp,rank,quiz_count,correct_answers,perfect_streak,history,selected_at").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: department, error: deptError } = await db.from("department_catalog").select("id,name,description,source_url").eq("id", data.department_id).single();
  if (deptError) throw deptError;
  return { ...data, rank_name: DEPT_RANKS[Math.min(7, Math.max(0, Number(data.rank) || 0))], department };
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Metodo non consentito" }, 405);
  try {
    const user = await getUser(req);
    if (!user) return reply({ error: "Sessione non valida" }, 401);
    const { data: profile, error: profileError } = await db.from("profiles").select("active,deleted,initial_rank").eq("id", user.id).maybeSingle();
    if (profileError || !profile?.active || profile.deleted) return reply({ error: "Account non attivo" }, 403);
    const body = await req.json();
    const action = String(body.action ?? "");
    if (action === "catalog") {
      const { data, error } = await db.from("department_catalog").select("id,name,description,source_url").eq("active", true).order("name");
      if (error) return reply({ error: "Catalogo reparti non disponibile" }, 500);
      return reply({ departments: data ?? [] });
    }
    if (action === "status") return reply({ membership: await getMembership(user.id) });
    if (action === "join") {
      const rankRow = await db.from("progress").select("payload").eq("user_id", user.id).maybeSingle();
      if (rankRow.error) return reply({ error: "Impossibile verificare il grado personale" }, 500);
      const personalRank = Math.max(Number(profile.initial_rank) || 0, Number(rankRow.data?.payload?.rank) || 0);
      if (personalRank < 5) return reply({ error: "La Carriera Reparto si sblocca dal grado di Brigadiere." }, 403);
      const departmentId = String(body.department_id ?? "");
      const { data: department, error: departmentError } = await db.from("department_catalog").select("id").eq("id", departmentId).eq("active", true).maybeSingle();
      if (departmentError || !department) return reply({ error: "Reparto non valido" }, 400);
      const existing = await db.from("department_memberships").select("user_id").eq("user_id", user.id).maybeSingle();
      if (existing.error) return reply({ error: "Impossibile verificare l'appartenenza" }, 500);
      if (existing.data) return reply({ error: "Hai già scelto un reparto. La scelta è unica e non può essere modificata da questa sezione." }, 409);
      const { error: insertError } = await db.from("department_memberships").insert({ user_id: user.id, department_id: departmentId });
      if (insertError) return reply({ error: insertError.code === "23505" ? "Hai già scelto un reparto." : "Impossibile registrare la scelta del reparto." }, insertError.code === "23505" ? 409 : 500);
      return reply({ membership: await getMembership(user.id) }, 201);
    }
    const membership = await getMembership(user.id);
    if (!membership) return reply({ error: "Non hai ancora scelto un reparto." }, 403);
    if (action === "start") {
      const { data: open, error: openError } = await db.from("department_quiz_attempts").select("id,question_ids,answers,started_at").eq("user_id", user.id).eq("department_id", membership.department_id).is("completed_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (openError) return reply({ error: "Impossibile verificare la sessione reparto" }, 500);
      if (open && new Date(open.started_at).getTime() >= Date.now() - SESSION_MS) {
        const { data: rows, error } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").in("id", open.question_ids);
        if (error || !rows) return reply({ error: "Impossibile riprendere il quiz reparto" }, 500);
        const byId = new Map(rows.map(q => [q.id, q]));
        const questions = open.question_ids.map((id: string) => byId.get(id)).filter(Boolean);
        if (questions.length !== 4) return reply({ error: "Sessione reparto non più disponibile" }, 409);
        return reply({ attempt_id: open.id, questions, answers: open.answers ?? [], expires_at: new Date(new Date(open.started_at).getTime() + SESSION_MS).toISOString(), resumed: true, membership });
      }
      if (open) await db.from("department_quiz_attempts").update({ completed_at: new Date().toISOString() }).eq("id", open.id).is("completed_at", null);
      const band = membership.rank < 2 ? 0 : membership.rank < 5 ? 1 : 2;
      const { data: pool, error: poolError } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").eq("department_id", membership.department_id).eq("rank_band", band).eq("active", true);
      if (poolError || !pool || pool.length < 4) return reply({ error: "Banca domande insufficiente per questo livello. Contatta l'amministratore." }, 500);
      const selected = pool.sort(() => Math.random() - 0.5).slice(0, 4);
      const { data: attempt, error: insertError } = await db.from("department_quiz_attempts").insert({ user_id: user.id, department_id: membership.department_id, question_ids: selected.map(q => q.id) }).select("id,started_at").single();
      if (insertError) {
        if (insertError.code === "23505") {
          const { data: concurrent } = await db.from("department_quiz_attempts").select("id,question_ids,answers,started_at").eq("user_id",user.id).eq("department_id",membership.department_id).is("completed_at",null).maybeSingle();
          if (concurrent) {
            const { data: concurrentRows, error: concurrentError } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").in("id",concurrent.question_ids);
            if (!concurrentError && concurrentRows) {
              const concurrentById = new Map(concurrentRows.map(q => [q.id,q]));
              const concurrentQuestions = concurrent.question_ids.map((id: string) => concurrentById.get(id)).filter(Boolean);
              if (concurrentQuestions.length === 4) return reply({ attempt_id: concurrent.id, questions: concurrentQuestions, answers: concurrent.answers ?? [], expires_at: new Date(new Date(concurrent.started_at).getTime() + SESSION_MS).toISOString(), resumed: true, membership });
            }
          }
        }
        return reply({ error: "Impossibile avviare il quiz reparto" }, 500);
      }
      return reply({ attempt_id: attempt.id, questions: selected, answers: [], expires_at: new Date(new Date(attempt.started_at).getTime() + SESSION_MS).toISOString(), resumed: false, membership });
    }
    if (action === "save") {
      const attemptId = String(body.attempt_id ?? "");
      const answers = body.answers;
      if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !Array.isArray(answers) || answers.length < 1 || answers.length > 4 || answers.some((a: unknown) => !Number.isInteger(a) || Number(a) < 0 || Number(a) > 3)) return reply({ error: "Checkpoint non valido" }, 400);
      const { data: attempt, error } = await db.from("department_quiz_attempts").select("id,started_at,completed_at").eq("id", attemptId).eq("user_id", user.id).eq("department_id", membership.department_id).maybeSingle();
      if (error || !attempt) return reply({ error: "Sessione reparto non trovata" }, 404);
      if (attempt.completed_at) return reply({ error: "Quiz reparto già consegnato" }, 409);
      if (new Date(attempt.started_at).getTime() < Date.now() - SESSION_MS) return reply({ error: "Sessione reparto scaduta" }, 410);
      const { error: saveError } = await db.from("department_quiz_attempts").update({ answers }).eq("id", attemptId).eq("user_id", user.id).is("completed_at", null);
      if (saveError) return reply({ error: "Checkpoint non salvato" }, 500);
      return reply({ saved: true, count: answers.length });
    }
    if (action === "submit") {
      const attemptId = String(body.attempt_id ?? "");
      const answers = body.answers;
      if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !Array.isArray(answers) || answers.length !== 4 || answers.some((a: unknown) => !Number.isInteger(a) || Number(a) < 0 || Number(a) > 3)) return reply({ error: "Risposte non valide" }, 400);
      const { data, error } = await db.rpc("complete_department_quiz", { p_user_id: user.id, p_attempt_id: attemptId, p_answers: answers });
      if (error) {
        const code = error.code === "23505" ? 409 : error.code === "42501" ? 403 : 400;
        return reply({ error: error.message === "Quiz reparto già consegnato" ? "Questo quiz reparto è già stato consegnato." : error.message === "Sessione reparto scaduta" ? "Il tempo della sessione è scaduto." : "Impossibile registrare il risultato del reparto." }, code);
      }
      return reply({ ...data, membership: await getMembership(user.id) });
    }
    return reply({ error: "Azione non riconosciuta" }, 400);
  } catch (error) {
    console.error("department-engine", error);
    return reply({ error: "Errore durante la gestione della carriera reparto" }, 500);
  }
});