import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGINS = new Set([
  "https://nnnsssxxxd-coder.github.io",
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost"
]);
function corsHeadersFor(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin", "Content-Type": "application/json", "Cache-Control": "no-store" } });
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
  const { data: command, error: commandError } = await db.from("department_commanders").select("commander_user_id").eq("department_id", data.department_id).maybeSingle();
  if (commandError) throw commandError;
  return { ...data, is_commander: command?.commander_user_id === userId, rank_name: DEPT_RANKS[Math.min(7, Math.max(0, Number(data.rank) || 0))], department };
}
Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
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
    const isCommander = membership.is_commander === true;
    const commandExamReady = Number(membership.rank) === 6 && Number(membership.exp) >= 2100 && !isCommander;

    const safeCqb = [
      {prompt:"Durante un’esercitazione simulata, una persona non identificata entra nell’area delimitata. Qual è la prima condotta corretta?",options:["Interrompere l’attività, mantenere distanza e chiedere identificazione tramite il responsabile","Avvicinarsi rapidamente senza comunicare","Dare per scontato che sia una minaccia","Proseguire ignorando la presenza"],correct_index:0,explanation:"La priorità è fermare l’attività, evitare escalation e chiarire la situazione in sicurezza."},
      {prompt:"La comunicazione radio diventa confusa e due operatori riferiscono ordini incompatibili. Cosa deve fare il gruppo?",options:["Agire ognuno secondo la propria interpretazione","Fermare la simulazione e ristabilire un’unica comunicazione tramite il referente","Aumentare il volume e parlare contemporaneamente","Ignorare le comunicazioni"],correct_index:1,explanation:"Una catena comunicativa chiara riduce errori; in caso di ambiguità l’esercitazione va sospesa."},
      {prompt:"Un partecipante segnala di non sentirsi bene durante il test. Qual è la priorità?",options:["Terminare comunque la prova","Chiedergli di resistere fino alla fine","Sospendere l’attività e attivare l’assistenza prevista","Lasciarlo in disparte senza verifiche"],correct_index:2,explanation:"La tutela delle persone viene prima del completamento dell’esercitazione."},
      {prompt:"Un elemento dello scenario non è chiaramente identificabile e potrebbe essere un civile estraneo. Come si procede?",options:["Trattarlo automaticamente come ostile","Non considerare l’incertezza","Aumentare la pressione per ottenere una reazione","Mantenere cautela, evitare azioni irreversibili e chiedere verifica al responsabile"],correct_index:3,explanation:"Identificazione positiva, proporzionalità e tutela dei terzi sono criteri essenziali."},
      {prompt:"Dopo un’esercitazione CQB simulata, quale attività consente una valutazione utile?",options:["Debriefing documentato su comunicazione, sicurezza, decisioni e rispetto delle regole","Valutare soltanto la velocità","Premiare chi ha ignorato le procedure","Non raccogliere osservazioni"],correct_index:0,explanation:"Il debriefing valuta processo, sicurezza e decisioni, non l’aggressività o la velocità."},
      {prompt:"Un partecipante propone di continuare nonostante una condizione di sicurezza non rispettata. Cosa deve fare il responsabile?",options:["Lasciare decidere al gruppo","Sospendere la prova finché la condizione non è ripristinata","Proseguire per non perdere tempo","Ridurre la registrazione degli eventi"],correct_index:1,explanation:"Le condizioni di sicurezza sono vincolanti e prevalgono sul completamento del test."}
    ];
    const commandExam = [
      {prompt:"Qual è la responsabilità principale di chi coordina un reparto in questa simulazione?",options:["Garantire sicurezza, legalità, comunicazione e valutazione imparziale","Massimizzare il punteggio a ogni costo","Decidere senza ascoltare il gruppo","Evitare la documentazione"],correct_index:0},
      {prompt:"Due subordinati segnalano versioni diverse di un evento. Come si procede?",options:["Scegliere il racconto del più anziano","Verificare i fatti, raccogliere entrambe le versioni e documentare","Ignorare la segnalazione","Punire entrambi preventivamente"],correct_index:1},
      {prompt:"Durante una simulazione emerge un rischio non previsto per un partecipante.",options:["Continuare con cautela senza avvisare","Delegare senza interrompere","Sospendere l’attività e applicare le misure di sicurezza","Nascondere l’accaduto"],correct_index:2},
      {prompt:"Come si assegna un’esercitazione ai membri del reparto?",options:["Senza obiettivo né criteri","Solo in base alle simpatie","Senza registrare gli esiti","Con obiettivo chiaro, condizioni sicure e criteri uguali per tutti"],correct_index:3},
      {prompt:"Quale criterio deve guidare la gestione di informazioni personali nei risultati?",options:["Accesso limitato a chi ne ha necessità e uso pertinente","Pubblicazione indiscriminata","Condivisione esterna libera","Conservazione senza limiti"],correct_index:0},
      {prompt:"Quale condotta dimostra imparzialità nella valutazione?",options:["Modificare la soglia dopo aver visto i risultati","Applicare gli stessi criteri e registrare l’esito in modo verificabile","Favorire il proprio gruppo","Ignorare gli errori dei preferiti"],correct_index:1}
    ];
    if (action === "command_exam_start") {
      if (!commandExamReady) return reply({ error: "Il Test di comando si sblocca al grado Vice comandante di reparto e al 100% degli EXP (2100)." }, 403);
      const {data: attempt,error} = await db.from("department_command_exam_attempts").insert({department_id:membership.department_id,user_id:user.id}).select("id,started_at").single();
      if(error) return reply({error:"Impossibile avviare la prova di comando."},500);
      return reply({attempt_id:attempt.id,questions:commandExam.map(({prompt,options})=>({prompt,options})),expires_at:new Date(new Date(attempt.started_at).getTime()+30*60*1000).toISOString()});
    }
    if (action === "command_exam_submit") {
      const id=String(body.attempt_id??""); const answers=body.answers;
      if(!/^[0-9a-f-]{36}$/i.test(id)||!Array.isArray(answers)||answers.length!==6||answers.some((a:unknown)=>!Number.isInteger(a)||Number(a)<0||Number(a)>3)) return reply({error:"Risposte non valide."},400);
      const {data:attempt,error}=await db.from("department_command_exam_attempts").select("*").eq("id",id).eq("user_id",user.id).eq("department_id",membership.department_id).maybeSingle();
      if(error||!attempt||attempt.completed_at||new Date(attempt.started_at).getTime()<Date.now()-30*60*1000) return reply({error:"Prova non valida o scaduta."},409);
      if (!commandExamReady) return reply({ error: "Requisiti del Test di comando non più soddisfatti." }, 403);
      const score=answers.reduce((n:number,a:number,i:number)=>n+(a===commandExam[i].correct_index?1:0),0),passed=score>=4;
      const {error:saveError}=await db.from("department_command_exam_attempts").update({answers,score,passed,completed_at:passed?null:new Date().toISOString()}).eq("id",id).is("completed_at",null);
      if(saveError)return reply({error:"Impossibile registrare la prova."},500);
      if(!passed)return reply({score,total:6,passed:false,message:"Prova non superata. Puoi riprovare dopo aver ripassato i criteri di comando."});
      const {data:promotion,error:promotionError}=await db.rpc("promote_department_commander",{p_user_id:user.id,p_department_id:membership.department_id,p_exam_attempt_id:id});
      if(promotionError)return reply({error:"Prova superata, ma la nomina non è stata registrata. Contatta l’amministratore."},409);
      return reply({score,total:6,passed:true,promotion,membership:await getMembership(user.id)});
    }
    if (action === "command_board") {
      const {data:command,error:commandError}=await db.from("department_commanders").select("commander_user_id,vice_user_id,appointed_at").eq("department_id",membership.department_id).maybeSingle();
      if(commandError)return reply({error:"Impossibile leggere la catena di comando."},500);
      const {data:members,error:membersError}=await db.from("department_memberships").select("user_id,rank,exp").eq("department_id",membership.department_id).order("rank",{ascending:false});
      if(membersError)return reply({error:"Impossibile leggere il personale del reparto."},500);
      const ids=(members??[]).map((m:any)=>m.user_id);
      const {data:profiles}=ids.length?await db.from("profiles").select("id,display_name,username").in("id",ids):{data:[]};
      const names=new Map((profiles??[]).map((p:any)=>[p.id,p]));
      const roster=(members??[]).map((m:any)=>({user_id:m.user_id,rank:m.rank,exp:m.exp,name:names.get(m.user_id)?.display_name||names.get(m.user_id)?.username||"Utente"}));
      if(command?.commander_user_id!==user.id) {
        const {data:assigned}=await db.from("department_exercise_assignments").select("id,exercise_id,assigned_at").eq("user_id",user.id).order("assigned_at",{ascending:false});
        const ids2=(assigned??[]).map((a:any)=>a.exercise_id);
        const {data:exercises}=ids2.length?await db.from("department_exercises").select("id,title,created_at").in("id",ids2):{data:[]};
        const exMap=new Map((exercises??[]).map((x:any)=>[x.id,x]));
        const {data:attempts}=assigned?.length?await db.from("department_exercise_attempts").select("assignment_id,score,correct_answers,exp_awarded,completed_at").in("assignment_id",assigned.map((a:any)=>a.id)):{data:[]};
        const atMap=new Map((attempts??[]).map((a:any)=>[a.assignment_id,a]));
        return reply({is_commander:false,commander,roster,assigned:(assigned??[]).map((a:any)=>({id:a.id,...(exMap.get(a.exercise_id)||{}),result:atMap.get(a.id)||null}))});
      }
      const {data:exercises}=await db.from("department_exercises").select("id,title,created_at").eq("department_id",membership.department_id).eq("active",true).order("created_at",{ascending:false});
      const exIds=(exercises??[]).map((x:any)=>x.id);
      const {data:assignments}=exIds.length?await db.from("department_exercise_assignments").select("id,exercise_id,user_id,assigned_at").in("exercise_id",exIds):{data:[]};
      const {data:attempts}=assignments?.length?await db.from("department_exercise_attempts").select("assignment_id,score,correct_answers,exp_awarded,completed_at").in("assignment_id",assignments.map((a:any)=>a.id)):{data:[]};
      const attemptMap=new Map((attempts??[]).map((a:any)=>[a.assignment_id,a]));
      const exerciseMap=new Map((exercises??[]).map((e:any)=>[e.id,e]));
      const results=(assignments??[]).map((a:any)=>({assignment_id:a.id,user_id:a.user_id,name:names.get(a.user_id)?.display_name||names.get(a.user_id)?.username||"Utente",title:exerciseMap.get(a.exercise_id)?.title||"Test di reparto",score:attemptMap.get(a.id)?.score??null,correct_answers:attemptMap.get(a.id)?.correct_answers??null,exp_awarded:attemptMap.get(a.id)?.exp_awarded??null,completed_at:attemptMap.get(a.id)?.completed_at??null}));
      return reply({is_commander:true,commander,roster,results});
    }
    if (action === "assign_test" || action === "assign_cqb") {
      if(!isCommander || Number(membership.rank)!==7) return reply({error:"Solo il comandante in carica può assegnare test."},403);
      const title=String(body.title||"Test di reparto · valutazione e sicurezza").trim().slice(0,100);
      if(title.length<3) return reply({error:"Il titolo del test deve contenere almeno 3 caratteri."},400);
      const {data:assignment,error}=await db.rpc("assign_department_exercise",{
        p_user_id:user.id,p_department_id:membership.department_id,p_title:title,
        p_questions:safeCqb
      });
      if(error) return reply({error:error.message||"Impossibile assegnare il test."},400);
      return reply(assignment,201);
    }
    if (action === "exercise_start") {
      if(isCommander) return reply({error:"Il comandante non può svolgere test di reparto assegnati."},403);
      const assignmentId=String(body.assignment_id??"");
      const {data:assignment,error}=await db.from("department_exercise_assignments").select("id,exercise_id").eq("id",assignmentId).eq("user_id",user.id).maybeSingle();
      if(error||!assignment)return reply({error:"Esercitazione non assegnata a questo account."},404);
      const {data:exercise,error:exerciseError}=await db.from("department_exercises").select("id,department_id,title,active").eq("id",assignment.exercise_id).eq("department_id",membership.department_id).eq("active",true).maybeSingle();
      if(exerciseError||!exercise) return reply({error:"Test non appartenente al tuo reparto o non disponibile."},403);
      const {data:existing}=await db.from("department_exercise_attempts").select("id,answers,started_at,completed_at").eq("assignment_id",assignment.id).maybeSingle();
      if(existing?.completed_at)return reply({error:"Esercitazione già completata."},409);
      const attempt=existing|| (await db.from("department_exercise_attempts").insert({assignment_id:assignment.id,user_id:user.id}).select("id,started_at").single()).data;
      if(!attempt)return reply({error:"Impossibile avviare l’esercitazione."},500);
      const {data:questions,error:questionError}=await db.from("department_exercise_questions").select("id,prompt,options").eq("exercise_id",assignment.exercise_id).order("id");
      if(questionError||!questions||questions.length!==6) return reply({error:"Domande del test non disponibili."},500);
      return reply({attempt_id:attempt.id,title:exercise.title,questions,answers:attempt.answers??[],expires_at:new Date(new Date(attempt.started_at).getTime()+45*60*1000).toISOString()});
    }
    if (action === "exercise_submit") {
      if(isCommander) return reply({error:"Il comandante non può svolgere test assegnati."},403);
      const id=String(body.attempt_id??""),answers=body.answers;
      if(!/^[0-9a-f-]{36}$/i.test(id)||!Array.isArray(answers)||answers.length!==6||answers.some((a:unknown)=>!Number.isInteger(a)||Number(a)<0||Number(a)>3))return reply({error:"Risposte non valide."},400);
      const {data,error}=await db.rpc("complete_department_exercise",{p_user_id:user.id,p_attempt_id:id,p_answers:answers});
      if(error){
        const msg=String(error.message||"");
        const status=/già completato/.test(msg)?409:/non appartieni|comandante/.test(msg)?403:400;
        return reply({error:msg||"Impossibile registrare il risultato del test."},status);
      }
      return reply(data);
    }
    if (action === "start") {
      if(isCommander) return reply({error:"Il comandante non può più svolgere quiz personali di reparto."},403);
      if(Number(membership.rank)>=6 && Number(membership.exp)>=2100) return reply({error:"Hai raggiunto il 100% EXP: è disponibile il Test di comando."},403);
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
      if(isCommander) return reply({error:"Il comandante non può più svolgere quiz personali di reparto."},403);
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
      if(isCommander) return reply({error:"Il comandante non può più svolgere quiz personali di reparto."},403);
      if(Number(membership.rank)>=6 && Number(membership.exp)>=2100) return reply({error:"Hai raggiunto il 100% EXP: è disponibile il Test di comando."},403);
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