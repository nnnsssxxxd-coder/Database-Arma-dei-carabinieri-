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
function reply(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeadersFor(req),"Content-Type":"application/json","Cache-Control":"no-store"}});}
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
async function getMembership(userId: string, branch: string) {
  const { data, error } = await db.from("department_memberships").select("user_id,department_id,exp,rank,quiz_count,correct_answers,perfect_streak,history,selected_at").eq("user_id", userId).eq("service_branch", branch).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: department, error: deptError } = await db.from("department_catalog").select("id,name,description,source_url").eq("id", data.department_id).eq("service_branch", branch).single();
  if (deptError) throw deptError;
  const { data: command, error: commandError } = await db.from("department_commanders").select("commander_user_id").eq("department_id", data.department_id).eq("service_branch", branch).maybeSingle();
  if (commandError) throw commandError;
  const isCommander = command?.commander_user_id === userId;
  return { ...data, is_commander: isCommander, rank_name: DEPT_RANKS[isCommander ? 7 : Math.min(6, Math.max(0, Number(data.rank) || 0))], department };
}
Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(req,{ error: "Metodo non consentito" }, 405);
  try {
    const user = await getUser(req);
    if (!user) return reply(req,{ error: "Sessione non valida" }, 401);
    const body = await req.json();
    const branch=String(body.service_branch??"");
    if(!["carabinieri","finanza"].includes(branch))return reply(req,{error:"Corpo selezionato non valido."},400);
    const { data: profile, error: profileError } = await db.from("profiles").select("active,deleted").eq("id", user.id).maybeSingle();
    if (profileError || !profile?.active || profile.deleted) return reply(req,{ error: "Account non attivo" }, 403);
    const {data:membershipAccess}=await db.from("profile_memberships").select("initial_rank").eq("user_id",user.id).eq("service_branch",branch).eq("active",true).maybeSingle();
    if(!membershipAccess)return reply(req,{error:"Non sei abilitato per questo Corpo."},403);
    if(branch!=="carabinieri")return reply(req,{error:"La carriera reparti della Guardia di Finanza deve essere configurata con catalogo e prove autonomi. I reparti Carabinieri non sono accessibili da questo ambiente."},403);
    const action = String(body.action ?? "");
    if (action === "catalog") {
      const { data, error } = await db.from("department_catalog").select("id,name,description,source_url").eq("service_branch",branch).eq("active", true).order("name");
      if (error) return reply(req,{ error: "Catalogo reparti non disponibile" }, 500);
      return reply(req,{ departments: data ?? [] });
    }
    if (action === "status") return reply(req,{ membership: await getMembership(user.id, branch) });
    if (action === "join") {
      const rankRow = await db.from("progress").select("payload").eq("user_id", user.id).eq("service_branch",branch).maybeSingle();
      if (rankRow.error) return reply(req,{ error: "Impossibile verificare il grado personale" }, 500);
      const personalRank = Math.max(Number(profile.initial_rank) || 0, Number(rankRow.data?.payload?.rank) || 0);
      if (personalRank < 5) return reply(req,{ error: "La Carriera Reparto si sblocca dal grado di Brigadiere." }, 403);
      const departmentId = String(body.department_id ?? "");
      const { data: department, error: departmentError } = await db.from("department_catalog").select("id").eq("id", departmentId).eq("service_branch",branch).eq("active", true).maybeSingle();
      if (departmentError || !department) return reply(req,{ error: "Reparto non valido" }, 400);
      const existing = await db.from("department_memberships").select("user_id").eq("user_id", user.id).eq("service_branch",branch).maybeSingle();
      if (existing.error) return reply(req,{ error: "Impossibile verificare l'appartenenza" }, 500);
      if (existing.data) return reply(req,{ error: "Hai già scelto un reparto. La scelta è unica e non può essere modificata da questa sezione." }, 409);
      const { error: insertError } = await db.from("department_memberships").insert({ user_id: user.id, department_id: departmentId, service_branch:branch });
      if (insertError) return reply(req,{ error: insertError.code === "23505" ? "Hai già scelto un reparto." : "Impossibile registrare la scelta del reparto." }, insertError.code === "23505" ? 409 : 500);
      return reply(req,{ membership: await getMembership(user.id, branch) }, 201);
    }
    const membership = await getMembership(user.id, branch);
    if (!membership) return reply(req,{ error: "Non hai ancora scelto un reparto." }, 403);
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
      if (!commandExamReady) return reply(req,{ error: "Il Test di comando si sblocca al grado Vice comandante di reparto e al 100% degli EXP (2100)." }, 403);
      const {data:open,error:openError}=await db.from("department_command_exam_attempts").select("id,started_at,passed").eq("department_id",membership.department_id).eq("user_id",user.id).is("completed_at",null).order("started_at",{ascending:false}).limit(1).maybeSingle();
      if(openError)return reply(req,{error:"Impossibile verificare una prova di comando già aperta."},500);
      let attempt=open;
      if(attempt&&new Date(attempt.started_at).getTime()<Date.now()-30*60*1000){
        const {error:closeError}=await db.from("department_command_exam_attempts").update({completed_at:new Date().toISOString()}).eq("id",attempt.id).eq("user_id",user.id).is("completed_at",null);
        if(closeError)return reply(req,{error:"Impossibile chiudere la prova scaduta."},500);
        attempt=null;
      }
      if(!attempt){
        const {data:created,error:createError}=await db.from("department_command_exam_attempts").insert({department_id:membership.department_id,user_id:user.id}).select("id,started_at").single();
        if(createError){
          const {data:concurrent,error:concurrentError}=await db.from("department_command_exam_attempts").select("id,started_at,passed").eq("department_id",membership.department_id).eq("user_id",user.id).is("completed_at",null).order("started_at",{ascending:false}).limit(1).maybeSingle();
          if(concurrentError||!concurrent)return reply(req,{error:"Impossibile avviare la prova di comando."},500);
          attempt=concurrent;
        }else attempt=created;
      }
      return reply(req,{attempt_id:attempt.id,questions:commandExam.map(({prompt,options})=>({prompt,options})),expires_at:new Date(new Date(attempt.started_at).getTime()+30*60*1000).toISOString(),resumed:!!open&&attempt.id===open.id});
    }
    if (action === "command_exam_submit") {
      const id=String(body.attempt_id??""); const answers=body.answers;
      if(!/^[0-9a-f-]{36}$/i.test(id)||!Array.isArray(answers)||answers.length!==6||answers.some((a:unknown)=>!Number.isInteger(a)||Number(a)<0||Number(a)>3)) return reply(req,{error:"Risposte non valide."},400);
      const {data:attempt,error}=await db.from("department_command_exam_attempts").select("*").eq("id",id).eq("user_id",user.id).eq("department_id",membership.department_id).maybeSingle();
      if(error||!attempt||attempt.completed_at||new Date(attempt.started_at).getTime()<Date.now()-30*60*1000) return reply(req,{error:"Prova non valida o scaduta."},409);
      if (!commandExamReady) return reply(req,{ error: "Requisiti del Test di comando non più soddisfatti." }, 403);
      const score=answers.reduce((n:number,a:number,i:number)=>n+(a===commandExam[i].correct_index?1:0),0),passed=score>=4;
      const {error:saveError}=await db.from("department_command_exam_attempts").update({answers,score,passed,completed_at:passed?null:new Date().toISOString()}).eq("id",id).is("completed_at",null);
      if(saveError)return reply(req,{error:"Impossibile registrare la prova."},500);
      if(!passed)return reply(req,{score,total:6,passed:false,message:"Prova non superata. Puoi riprovare dopo aver ripassato i criteri di comando."});
      const {data:promotion,error:promotionError}=await db.rpc("promote_department_commander",{p_user_id:user.id,p_department_id:membership.department_id,p_exam_attempt_id:id});
      if(promotionError)return reply(req,{error:"Prova superata, ma la nomina non è stata registrata. Contatta l’amministratore."},409);
      return reply(req,{score,total:6,passed:true,promotion,membership:await getMembership(user.id, branch)});
    }
    if (action === "command_board") {
      const {data:command,error:commandError}=await db.from("department_commanders").select("commander_user_id,vice_user_id,appointed_at").eq("department_id",membership.department_id).maybeSingle();
      if(commandError)return reply(req,{error:"Impossibile leggere la catena di comando."},500);
      if(command?.commander_user_id!==user.id) {
        const {data:assigned}=await db.from("department_exercise_assignments").select("id,exercise_id,assigned_at").eq("user_id",user.id).order("assigned_at",{ascending:false});
        const ids2=(assigned??[]).map((a:any)=>a.exercise_id);
        const {data:exercises}=ids2.length?await db.from("department_exercises").select("id,title,created_at").in("id",ids2):{data:[]};
        const exMap=new Map((exercises??[]).map((x:any)=>[x.id,x]));
        const {data:attempts}=assigned?.length?await db.from("department_exercise_attempts").select("assignment_id,score,correct_answers,exp_awarded,completed_at").in("assignment_id",assigned.map((a:any)=>a.id)):{data:[]};
        const atMap=new Map((attempts??[]).map((a:any)=>[a.assignment_id,a]));
        return reply(req,{is_commander:false,assigned:(assigned??[]).map((a:any)=>({id:a.id,...(exMap.get(a.exercise_id)||{}),result:atMap.get(a.id)||null}))});
      }
      const {data:members,error:membersError}=await db.from("department_memberships").select("user_id,rank,exp").eq("department_id",membership.department_id).order("rank",{ascending:false});
      if(membersError)return reply(req,{error:"Impossibile leggere il personale del reparto."},500);
      const ids=(members??[]).map((m:any)=>m.user_id);
      const {data:profiles,error:profilesError}=ids.length?await db.from("profiles").select("id,display_name,username").in("id",ids):{data:[],error:null};
      if(profilesError)return reply(req,{error:"Impossibile leggere i nominativi del reparto."},500);
      const names=new Map((profiles??[]).map((p:any)=>[p.id,p]));
      const roster=(members??[]).map((m:any)=>({user_id:m.user_id,rank:m.rank,exp:m.exp,name:names.get(m.user_id)?.display_name||names.get(m.user_id)?.username||"Utente"}));
      const {data:exercises}=await db.from("department_exercises").select("id,title,created_at").eq("department_id",membership.department_id).eq("active",true).order("created_at",{ascending:false});
      const exIds=(exercises??[]).map((x:any)=>x.id);
      const {data:assignments}=exIds.length?await db.from("department_exercise_assignments").select("id,exercise_id,user_id,assigned_at").in("exercise_id",exIds):{data:[]};
      const {data:attempts}=assignments?.length?await db.from("department_exercise_attempts").select("assignment_id,score,correct_answers,exp_awarded,completed_at").in("assignment_id",assignments.map((a:any)=>a.id)):{data:[]};
      const attemptMap=new Map((attempts??[]).map((a:any)=>[a.assignment_id,a]));
      const exerciseMap=new Map((exercises??[]).map((e:any)=>[e.id,e]));
      const results=(assignments??[]).map((a:any)=>({assignment_id:a.id,user_id:a.user_id,name:names.get(a.user_id)?.display_name||names.get(a.user_id)?.username||"Utente",title:exerciseMap.get(a.exercise_id)?.title||"Test di reparto",score:attemptMap.get(a.id)?.score??null,correct_answers:attemptMap.get(a.id)?.correct_answers??null,exp_awarded:attemptMap.get(a.id)?.exp_awarded??null,completed_at:attemptMap.get(a.id)?.completed_at??null}));
      return reply(req,{is_commander:true,commander:command,roster,results});
    }
    if (action === "assign_test" || action === "assign_cqb") {
      if(!isCommander || Number(membership.rank)!==7) return reply(req,{error:"Solo il comandante in carica può assegnare test."},403);
      const title=String(body.title||"Test di reparto · valutazione e sicurezza").trim().slice(0,100);
      if(title.length<3) return reply(req,{error:"Il titolo del test deve contenere almeno 3 caratteri."},400);
      const {data:assignment,error}=await db.rpc("assign_department_exercise",{
        p_user_id:user.id,p_department_id:membership.department_id,p_title:title,
        p_questions:safeCqb
      });
      if(error) return reply(req,{error:error.message||"Impossibile assegnare il test."},400);
      return reply(req,assignment,201);
    }
    if (action === "exercise_start") {
      if(isCommander) return reply(req,{error:"Il comandante non può svolgere test di reparto assegnati."},403);
      const assignmentId=String(body.assignment_id??"");
      const {data:assignment,error}=await db.from("department_exercise_assignments").select("id,exercise_id").eq("id",assignmentId).eq("user_id",user.id).maybeSingle();
      if(error||!assignment)return reply(req,{error:"Esercitazione non assegnata a questo account."},404);
      const {data:exercise,error:exerciseError}=await db.from("department_exercises").select("id,department_id,title,active,assigned_by").eq("id",assignment.exercise_id).eq("department_id",membership.department_id).eq("active",true).maybeSingle();
      if(exerciseError||!exercise) return reply(req,{error:"Test non appartenente al tuo reparto o non disponibile."},403);
      const {data:questions,error:questionError}=await db.from("department_exercise_questions").select("id,prompt,options").eq("exercise_id",assignment.exercise_id).order("id");
       if(questionError||!questions||questions.length!==6) return reply(req,{error:"Domande del test non disponibili."},500);
       const {data:existing,error:existingError}=await db.from("department_exercise_attempts").select("id,answers,started_at,completed_at").eq("assignment_id",assignment.id).maybeSingle();
       if(existingError)return reply(req,{error:"Impossibile verificare il tentativo già aperto."},500);
       if(existing?.completed_at)return reply(req,{error:"Esercitazione già completata."},409);
       let attempt=existing;
       if(!attempt){
         const {data:created,error:createError}=await db.from("department_exercise_attempts").insert({assignment_id:assignment.id,user_id:user.id}).select("id,answers,started_at,completed_at").single();
         if(createError){
           const {data:concurrent,error:concurrentError}=await db.from("department_exercise_attempts").select("id,answers,started_at,completed_at").eq("assignment_id",assignment.id).maybeSingle();
           if(concurrentError||!concurrent||concurrent.completed_at)return reply(req,{error:"Impossibile avviare l’esercitazione."},500);
           attempt=concurrent;
         }else attempt=created;
       }
       if(!attempt)return reply(req,{error:"Impossibile avviare l’esercitazione."},500);
      const {data:assigner}=exercise.assigned_by?await db.from("profiles").select("display_name,username").eq("id",exercise.assigned_by).maybeSingle():{data:null};
      return reply(req,{attempt_id:attempt.id,title:exercise.title,assigned_by:{name:assigner?.display_name||assigner?.username||"Comandante di reparto",role:"Comandante di reparto"},questions,answers:attempt.answers??[],expires_at:new Date(new Date(attempt.started_at).getTime()+45*60*1000).toISOString()});
    }
    if (action === "exercise_submit") {
      if(isCommander) return reply(req,{error:"Il comandante non può svolgere test assegnati."},403);
      const id=String(body.attempt_id??""),answers=body.answers;
      if(!/^[0-9a-f-]{36}$/i.test(id)||!Array.isArray(answers)||answers.length!==6||answers.some((a:unknown)=>!Number.isInteger(a)||Number(a)<0||Number(a)>3))return reply(req,{error:"Risposte non valide."},400);
      const {data,error}=await db.rpc("complete_department_exercise",{p_user_id:user.id,p_attempt_id:id,p_answers:answers});
      if(error){
        const msg=String(error.message||"");
        const status=/già completato/.test(msg)?409:/non appartieni|comandante/.test(msg)?403:400;
        return reply(req,{error:msg||"Impossibile registrare il risultato del test."},status);
      }
      return reply(req,data);
    }
    if (action === "start") {
      if(isCommander) return reply(req,{error:"Il comandante non può più svolgere quiz personali di reparto."},403);
      if(Number(membership.rank)>=6 && Number(membership.exp)>=2100) return reply(req,{error:"Hai raggiunto il 100% EXP: è disponibile il Test di comando."},403);
      const { data: open, error: openError } = await db.from("department_quiz_attempts").select("id,question_ids,answers,started_at").eq("user_id", user.id).eq("department_id", membership.department_id).is("completed_at", null).order("started_at", { ascending: false }).limit(1).maybeSingle();
      if (openError) return reply(req,{ error: "Impossibile verificare la sessione reparto" }, 500);
      if (open && new Date(open.started_at).getTime() >= Date.now() - SESSION_MS) {
        const { data: rows, error } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").in("id", open.question_ids);
        if (error || !rows) return reply(req,{ error: "Impossibile riprendere il quiz reparto" }, 500);
        const byId = new Map(rows.map(q => [q.id, q]));
        const questions = open.question_ids.map((id: string) => byId.get(id)).filter(Boolean);
        if (questions.length !== 4) return reply(req,{ error: "Sessione reparto non più disponibile" }, 409);
        return reply(req,{ attempt_id: open.id, questions, answers: open.answers ?? [], expires_at: new Date(new Date(open.started_at).getTime() + SESSION_MS).toISOString(), resumed: true, membership });
      }
      if (open) await db.from("department_quiz_attempts").update({ completed_at: new Date().toISOString() }).eq("id", open.id).is("completed_at", null);
      const band = membership.rank < 2 ? 0 : membership.rank < 5 ? 1 : 2;
      const { data: pool, error: poolError } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").eq("department_id", membership.department_id).eq("rank_band", band).eq("active", true);
      if (poolError || !pool || pool.length < 4) return reply(req,{ error: "Banca domande insufficiente per questo livello. Contatta l'amministratore." }, 500);
      // Evita di riproporre allo stesso utente le domande completate nelle ultime 24 ore.
      const rotationWindow = 24 * 60 * 60 * 1000;
      const rotationSince = new Date(Date.now() - rotationWindow).toISOString();
      const { data: recent, error: recentError } = await db.from("department_quiz_attempts")
        .select("question_ids,completed_at").eq("user_id", user.id)
        .eq("department_id", membership.department_id).not("completed_at", "is", null)
        .gte("completed_at", rotationSince).order("completed_at", { ascending: true });
      if (recentError) return reply(req,{ error: "Impossibile verificare la rotazione delle domande." }, 500);
      const used = new Set<string>();
      for (const attempt of recent ?? []) for (const id of attempt.question_ids ?? []) used.add(id);
      const availablePool = pool.filter(q => !used.has(q.id));
      if (availablePool.length < 4) {
        const releaseTimes = [...new Set((recent ?? []).map(a => new Date(a.completed_at).getTime() + rotationWindow))].sort((a,b) => a-b);
        let cooldownUntil: number | null = null;
        for (const release of releaseTimes) {
          const stillUsed = new Set<string>();
          for (const attempt of recent ?? []) {
            if (new Date(attempt.completed_at).getTime() > release - rotationWindow) {
              for (const id of attempt.question_ids ?? []) stillUsed.add(id);
            }
          }
          if (pool.filter(q => !stillUsed.has(q.id)).length >= 4) { cooldownUntil = release; break; }
        }
        return reply(req,{ error: "Le domande già svolte sono in ripristino.", available: availablePool.length, cooldown_until: cooldownUntil ? new Date(cooldownUntil).toISOString() : null });
      }
      const shuffled = [...availablePool]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; } const selected = shuffled.slice(0, 4);
      const { data: attempt, error: insertError } = await db.from("department_quiz_attempts").insert({ user_id: user.id, department_id: membership.department_id, question_ids: selected.map(q => q.id) }).select("id,started_at").single();
      if (insertError) {
        if (insertError.code === "23505") {
          const { data: concurrent } = await db.from("department_quiz_attempts").select("id,question_ids,answers,started_at").eq("user_id",user.id).eq("department_id",membership.department_id).is("completed_at",null).maybeSingle();
          if (concurrent) {
            const { data: concurrentRows, error: concurrentError } = await db.from("department_questions").select("id,prompt,options,explanation,rank_band").in("id",concurrent.question_ids);
            if (!concurrentError && concurrentRows) {
              const concurrentById = new Map(concurrentRows.map(q => [q.id,q]));
              const concurrentQuestions = concurrent.question_ids.map((id: string) => concurrentById.get(id)).filter(Boolean);
              if (concurrentQuestions.length === 4) return reply(req,{ attempt_id: concurrent.id, questions: concurrentQuestions, answers: concurrent.answers ?? [], expires_at: new Date(new Date(concurrent.started_at).getTime() + SESSION_MS).toISOString(), resumed: true, membership });
            }
          }
        }
        return reply(req,{ error: "Impossibile avviare il quiz reparto" }, 500);
      }
      return reply(req,{ attempt_id: attempt.id, questions: selected, answers: [], expires_at: new Date(new Date(attempt.started_at).getTime() + SESSION_MS).toISOString(), resumed: false, membership });
    }
    if (action === "save") {
      if(isCommander) return reply(req,{error:"Il comandante non può più svolgere quiz personali di reparto."},403);
      if(Number(membership.rank)>=6 && Number(membership.exp)>=2100) return reply(req,{error:"Hai raggiunto il 100% EXP: è disponibile il Test di comando."},403);
      const attemptId = String(body.attempt_id ?? "");
      const answers = body.answers;
      if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !Array.isArray(answers) || answers.length < 1 || answers.length > 4 || answers.some((a: unknown) => !Number.isInteger(a) || Number(a) < 0 || Number(a) > 3)) return reply(req,{ error: "Checkpoint non valido" }, 400);
      const { data: attempt, error } = await db.from("department_quiz_attempts").select("id,started_at,completed_at").eq("id", attemptId).eq("user_id", user.id).eq("department_id", membership.department_id).maybeSingle();
      if (error || !attempt) return reply(req,{ error: "Sessione reparto non trovata" }, 404);
      if (attempt.completed_at) return reply(req,{ error: "Quiz reparto già consegnato" }, 409);
      if (new Date(attempt.started_at).getTime() < Date.now() - SESSION_MS) return reply(req,{ error: "Sessione reparto scaduta" }, 410);
      const { error: saveError } = await db.from("department_quiz_attempts").update({ answers }).eq("id", attemptId).eq("user_id", user.id).is("completed_at", null);
      if (saveError) return reply(req,{ error: "Checkpoint non salvato" }, 500);
      return reply(req,{ saved: true, count: answers.length });
    }
    if (action === "submit") {
      if(isCommander) return reply(req,{error:"Il comandante non può più svolgere quiz personali di reparto."},403);
      if(Number(membership.rank)>=6 && Number(membership.exp)>=2100) return reply(req,{error:"Hai raggiunto il 100% EXP: è disponibile il Test di comando."},403);
      const attemptId = String(body.attempt_id ?? "");
      const answers = body.answers;
      if (!/^[0-9a-f-]{36}$/i.test(attemptId) || !Array.isArray(answers) || answers.length !== 4 || answers.some((a: unknown) => !Number.isInteger(a) || Number(a) < 0 || Number(a) > 3)) return reply(req,{ error: "Risposte non valide" }, 400);
      const { data, error } = await db.rpc("complete_department_quiz", { p_user_id: user.id, p_attempt_id: attemptId, p_answers: answers });
      if (error) {
        const code = error.code === "23505" ? 409 : error.code === "42501" ? 403 : 400;
        return reply(req,{ error: error.message === "Quiz reparto già consegnato" ? "Questo quiz reparto è già stato consegnato." : error.message === "Sessione reparto scaduta" ? "Il tempo della sessione è scaduto." : "Impossibile registrare il risultato del reparto." }, code);
      }
      return reply(req,{ ...data, membership: await getMembership(user.id, branch) });
    }
    return reply(req,{ error: "Azione non riconosciuta" }, 400);
  } catch (error) {
    console.error("department-engine", error);
    return reply(req,{ error: "Errore durante la gestione della carriera reparto" }, 500);
  }
});