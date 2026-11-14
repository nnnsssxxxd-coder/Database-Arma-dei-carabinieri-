import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://localhost", "http://localhost", "capacitor://localhost",
  "ionic://localhost", "https://nnnsssxxxd-coder.github.io"
]);
const cors = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  const h: Record<string,string> = {
    "Vary":"Origin",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Access-Control-Max-Age":"86400"
  };
  if (ALLOWED_ORIGINS.has(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
};
const reply = (req:Request, data:unknown, status=200) =>
  new Response(JSON.stringify(data), {status, headers:{...cors(req),"Content-Type":"application/json","Cache-Control":"no-store"}});
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(url, service, {auth:{persistSession:false}});
const scenarios = [
 {id:"belt-check",vehicle:"Berlina grigia",plate:"EX 482 KM",driver:"Marco R.",model:"Berlina media",situation:"Il conducente attraversa un tratto urbano senza indossare la cintura. Il veicolo è fermo al semaforo e non ci sono altre anomalie.",clues:["Cintura non allacciata","Nessuna altra infrazione rilevata","Condotta collaborativa"],action:"sanzione",explanation:"La cintura di sicurezza è obbligatoria: la condotta corretta è contestare l'infrazione prevista."},
 {id:"documents-ok",vehicle:"SUV blu",plate:"GF 731 PL",driver:"Elena C.",model:"SUV familiare",situation:"Documenti validi, revisione regolare e cintura allacciata. Non emergono violazioni durante il controllo.",clues:["Patente valida","Revisione regolare","Nessuna violazione osservata"],action:"nessuna_violazione",explanation:"Non si deve elevare una sanzione senza un'infrazione accertata."},
 {id:"phone-use",vehicle:"Utilitaria bianca",plate:"HT 205 NR",driver:"Luca P.",model:"Utilitaria",situation:"Durante la marcia il conducente utilizza il telefono tenendolo in mano. La pattuglia osserva chiaramente la condotta.",clues:["Telefono in mano durante la guida","Veicolo in movimento","Condotta osservata direttamente"],action:"sanzione",explanation:"L'uso del telefono tenuto in mano durante la guida costituisce una violazione."},
 {id:"minor-light",vehicle:"Compatta rossa",plate:"DR 918 FS",driver:"Sara M.",model:"Compatta",situation:"Un fanale posteriore è spento. Il conducente si ferma in sicurezza e collabora; non risultano altre violazioni.",clues:["Luce posteriore non funzionante","Nessun pericolo immediato aggiuntivo","Conducente collaborativo"],action:"avviso",explanation:"Per questa simulazione didattica è previsto un richiamo con invito alla riparazione, senza inventare altre violazioni."},
 {id:"speeding",vehicle:"Crossover nero",plate:"LM 640 VT",driver:"Andrea F.",model:"Crossover",situation:"Il rilevamento omologato indica una velocità superiore al limite segnalato. La misurazione è valida e verificata.",clues:["Limite segnalato 50 km/h","Rilevamento verificato 68 km/h","Dispositivo regolarmente verificato"],action:"sanzione",explanation:"La violazione è documentata da un rilevamento valido: si procede secondo la normativa."},
 {id:"parking-ok",vehicle:"Van argento",plate:"CP 114 AZ",driver:"Nadia S.",model:"Veicolo commerciale",situation:"Il veicolo è in sosta regolare in uno stallo consentito. Il passaggio pedonale e l'accesso sono liberi.",clues:["Stallo consentito","Nessun intralcio","Segnaletica rispettata"],action:"nessuna_violazione",explanation:"La sosta è regolare: non va contestata alcuna infrazione."},
 {id:"inspection",vehicle:"Station wagon verde",plate:"FA 590 QX",driver:"Paolo D.",model:"Station wagon",situation:"La revisione risulta scaduta dalla consultazione dei dati del veicolo. Il resto dei documenti è regolare.",clues:["Revisione scaduta","Identità del veicolo verificata","Nessuna anomalia documentale ulteriore"],action:"sanzione",explanation:"La revisione scaduta è una violazione accertata e va contestata secondo le procedure."},
 {id:"courtesy",vehicle:"Citycar avorio",plate:"GN 367 BK",driver:"Marta L.",model:"Citycar",situation:"Il conducente segnala un malore lieve e chiede aiuto. Non sono state rilevate infrazioni stradali.",clues:["Richiesta di assistenza","Nessuna infrazione rilevata","Necessario attivare i soccorsi se opportuno"],action:"nessuna_violazione",explanation:"La priorità è prestare assistenza e non trasformare una richiesta di aiuto in una sanzione."}
 ,
 {id:"wrong-parking",vehicle:"Furgone bianco",plate:"KA 804 MN",driver:"Davide T.",model:"Veicolo commerciale",situation:"Il furgone è parcheggiato davanti a uno scivolo per persone con disabilità, impedendone completamente l'accesso. La segnaletica è visibile.",clues:["Scivolo ostruito","Segnaletica presente","Impedimento effettivo"],action:"sanzione",explanation:"L'occupazione dello scivolo impedisce l'accessibilità: la violazione va contestata secondo le procedure."},
 {id:"expired-insurance",vehicle:"Berlina blu scuro",plate:"PL 286 RX",driver:"Giulia B.",model:"Berlina",situation:"Dalla verifica della banca dati emerge che la copertura assicurativa obbligatoria non risulta attiva. L'identità e la targa sono state ricontrollate.",clues:["Copertura non attiva in banca dati","Targa verificata","Dati confermati"],action:"sanzione",explanation:"La copertura assicurativa obbligatoria risulta assente: occorre applicare le procedure previste."},
 {id:"safe-school-zone",vehicle:"Citycar grigia",plate:"RM 520 DT",driver:"Fabio N.",model:"Citycar",situation:"Il veicolo procede rispettando il limite nella zona scolastica. Attraversamenti e precedenze sono rispettati e non emergono anomalie.",clues:["Velocità nei limiti","Precedenze rispettate","Nessuna infrazione osservata"],action:"nessuna_violazione",explanation:"Il controllo non ha rilevato violazioni: non si deve contestare un illecito inesistente."},
 {id:"unsafe-load",vehicle:"Pick-up verde",plate:"CZ 119 YW",driver:"Enrico V.",model:"Pick-up",situation:"Il carico sul cassone non è adeguatamente fissato e alcuni oggetti sporgono in modo da poter cadere sulla carreggiata.",clues:["Carico non assicurato","Oggetti instabili","Rischio per gli altri utenti"],action:"sanzione",explanation:"Il carico deve essere sistemato e assicurato in modo da non creare pericolo o intralcio."},
 {id:"minor-defect",vehicle:"Compatta argento",plate:"FV 431 JK",driver:"Irene G.",model:"Compatta",situation:"Il conducente segnala spontaneamente un piccolo danno estetico alla carrozzeria. Luci, pneumatici e dispositivi di sicurezza risultano regolari.",clues:["Solo danno estetico","Dispositivi regolari","Nessun pericolo o infrazione"],action:"nessuna_violazione",explanation:"Un danno puramente estetico, senza ulteriori violazioni, non giustifica una sanzione stradale."},
 {id:"red-light",vehicle:"SUV nero",plate:"NC 972 HT",driver:"Stefano L.",model:"SUV",situation:"La pattuglia osserva il veicolo superare la linea di arresto e attraversare l'incrocio con semaforo rosso. La visuale è libera.",clues:["Semaforo rosso","Superamento linea di arresto","Condotta osservata direttamente"],action:"sanzione",explanation:"Il passaggio con semaforo rosso è una violazione da contestare secondo le procedure."},
 {id:"broken-tail-light",vehicle:"Station wagon blu",plate:"EZ 604 QP",driver:"Chiara R.",model:"Station wagon",situation:"Una luce posteriore è spenta. Il conducente è collaborativo e il controllo non evidenzia altre anomalie; la simulazione richiede un richiamo didattico.",clues:["Una luce non funzionante","Nessun'altra anomalia","Conducente collaborativo"],action:"avviso",explanation:"Nel caso didattico descritto è previsto un richiamo a ripristinare il dispositivo, senza aggiungere infrazioni non accertate."},
 {id:"emergency-help",vehicle:"Monovolume beige",plate:"BT 385 LA",driver:"Michele O.",model:"Monovolume",situation:"Una persona a bordo chiede assistenza perché non si sente bene. Il veicolo è in sosta sicura e non sono state rilevate infrazioni.",clues:["Richiesta di assistenza","Veicolo in sosta sicura","Nessuna violazione"],action:"nessuna_violazione",explanation:"La priorità è l'assistenza alla persona e l'eventuale attivazione dei soccorsi."}
];
async function getUser(req:Request) {
 const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")??""}},auth:{persistSession:false}});
 const {data:{user}}=await caller.auth.getUser(); return user;
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors(req)});
 if(req.method!=="POST") return reply(req,{error:"Metodo non consentito"},405);
 try {
  const user=await getUser(req);
  if(!user) return reply(req,{error:"Sessione non valida"},401);
  const body=await req.json();
  const branch=String(body.service_branch??"");
  if(!["carabinieri","finanza"].includes(branch)) return reply(req,{error:"Corpo non valido"},400);
  const {data:profile,error:pe}=await db.from("profiles").select("active,deleted").eq("id",user.id).maybeSingle();
  if(pe||!profile?.active||profile.deleted) return reply(req,{error:"Account non attivo"},403);
  const {data:membership,error:me}=await db.from("profile_memberships").select("user_id").eq("user_id",user.id).eq("service_branch",branch).eq("active",true).maybeSingle();
  if(me||!membership) return reply(req,{error:"Non sei abilitato per questo Corpo."},403);
  if(body.action==="start") {
    await db.from("traffic_control_sessions").update({completed_at:new Date().toISOString(),is_correct:false,exp_awarded:0}).eq("user_id",user.id).eq("service_branch",branch).is("completed_at",null).lt("expires_at",new Date().toISOString());
    const {data:openSession}=await db.from("traffic_control_sessions").select("id,scenario_id,expires_at").eq("user_id",user.id).eq("service_branch",branch).is("completed_at",null).maybeSingle();
    if(openSession){const existing=scenarios.find(item=>item.id===openSession.scenario_id);if(existing){const {action:existingAnswer,clues:privateClues,...publicExisting}=existing;return reply(req,{session_id:openSession.id,expires_at:openSession.expires_at,scenario:publicExisting,service_branch:branch,resumed:true},200);}}
    const {data:openSession}=await db.from("traffic_control_sessions").select("id,scenario_id,expires_at").eq("user_id",user.id).eq("service_branch",branch).is("completed_at",null).maybeSingle();
    if(openSession) {
      const existing=scenarios.find(item=>item.id===openSession.scenario_id);
      if(existing) { const {action:existingAnswer,...publicExisting}=existing; return reply(req,{session_id:openSession.id,expires_at:openSession.expires_at,scenario:publicExisting,service_branch:branch,resumed:true},200); }
    }
    const scenario=scenarios[Math.floor(Math.random()*scenarios.length)];
    const {data:session,error}=await db.from("traffic_control_sessions").insert({
      user_id:user.id,service_branch:branch,scenario_id:scenario.id,correct_action:scenario.action
    }).select("id,expires_at").single();
    if(error) {
      if(error.code==="23505") return reply(req,{error:"Hai già un controllo aperto. Completa il controllo in corso oppure attendi la sua scadenza."},409);
      throw error;
    }
    const {action:correctAction,clues:privateClues,...publicScenario}=scenario;
    return reply(req,{session_id:session.id,expires_at:session.expires_at,scenario:publicScenario,service_branch:branch},201);
  }
  if(body.action==="inspect") {
    const sessionId=String(body.session_id??"");
    const checkId=String(body.check_id??"");
    const checkIndex={documents:0,vehicle:1,conduct:2}[checkId];
    if(!/^[0-9a-f-]{36}$/i.test(sessionId)||checkIndex===undefined) return reply(req,{error:"Verifica non valida"},400);
    const {data:session,error:se}=await db.from("traffic_control_sessions").select("id,scenario_id,checks_completed,expires_at,completed_at").eq("id",sessionId).eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    if(se||!session||session.completed_at) return reply(req,{error:"Sessione di controllo non valida"},404);
    if(new Date(session.expires_at).getTime()<Date.now()) return reply(req,{error:"Tempo del controllo scaduto. Avvia un nuovo servizio."},410);
    const scenario=scenarios.find(item=>item.id===session.scenario_id);
    if(!scenario) return reply(req,{error:"Scenario non disponibile"},404);
    const completed=Array.isArray(session.checks_completed)?session.checks_completed:[];
    if(!completed.includes(checkId)) completed.push(checkId);
    const {error:ue}=await db.from("traffic_control_sessions").update({checks_completed:completed}).eq("id",sessionId).eq("user_id",user.id);
    if(ue) throw ue;
    return reply(req,{check_id:checkId,detail:scenario.clues[checkIndex],completed_checks:completed,all_checked:completed.length>=3});
  }
  if(body.action==="finish") {
    const sessionId=String(body.session_id??"");
    const chosen=String(body.chosen_action??"");
    if(!/^[0-9a-f-]{36}$/i.test(sessionId)) return reply(req,{error:"Sessione non valida"},400);
    const {data,error}=await db.rpc("finish_traffic_control_session",{
      p_session_id:sessionId,p_user_id:user.id,p_service_branch:branch,p_chosen_action:chosen
    });
    if(error) return reply(req,{error:error.message||"Impossibile registrare il controllo."},400);
    const {data:progressRow}=await db.from("progress").select("payload").eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    return reply(req,{...data,progress:progressRow?.payload??null});
  }
  return reply(req,{error:"Azione non riconosciuta"},400);
 } catch(error) {
  console.error("traffic-control-engine",error);
  return reply(req,{error:"Errore temporaneo del servizio. Riprova."},500);
 }
});
