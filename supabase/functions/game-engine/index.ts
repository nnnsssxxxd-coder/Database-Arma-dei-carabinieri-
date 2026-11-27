import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "ionic://localhost",
  "https://nnnsssxxxd-coder.github.io"
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

type MissionQuestion={prompt:string;options:string[];correct_index:number;explanation:string};
type MissionScenario={id:string;title:string;scenario:string;questions:MissionQuestion[]};
const MISSION_BANK:Record<string,MissionScenario[]> = {
 carabinieri:[
  {id:"academy_orientation",title:"Segnalazione di persona vulnerabile",scenario:"Durante un servizio territoriale arriva una segnalazione circostanziata relativa a una persona fragile che non rientra a casa. La priorità è raccogliere informazioni verificabili e coordinare la risposta.",questions:[
   {prompt:"Qual è il primo passaggio corretto?",options:["Raccogliere i dati essenziali della segnalazione e verificare le informazioni disponibili","Diffondere pubblicamente i dati personali","Considerare la segnalazione infondata senza riscontri"],correct_index:0,explanation:"La segnalazione va registrata e verificata con attenzione, tutelando i dati personali."},
   {prompt:"Come si gestiscono le informazioni personali?",options:["Si condividono solo con soggetti autorizzati e per finalità di servizio","Si pubblicano nei gruppi informali","Si conservano su dispositivi personali non protetti"],correct_index:0,explanation:"Riservatezza e minimizzazione dei dati sono obblighi essenziali."},
   {prompt:"Quale condotta conclude correttamente la fase iniziale?",options:["Documentare le attività e aggiornare la catena di coordinamento","Chiudere la segnalazione senza annotazioni","Formulare conclusioni non supportate"],correct_index:0,explanation:"La tracciabilità consente continuità e verifica dell'attività."}]},
  {id:"community_assistance",title:"Assistenza alla comunità",scenario:"Un cittadino segnala un ostacolo pericoloso su una strada comunale. Non vi sono feriti, ma la situazione può creare rischio per gli utenti.",questions:[
   {prompt:"Qual è la priorità?",options:["Segnalare il pericolo e attivare il soggetto competente per la messa in sicurezza","Spostare autonomamente qualsiasi oggetto senza valutazione","Ignorare la segnalazione"],correct_index:0,explanation:"La priorità è ridurre il rischio e coinvolgere i soggetti competenti."},
   {prompt:"Quali elementi vanno registrati?",options:["Luogo, orario, natura del rischio e comunicazioni effettuate","Solo il nome di chi ha chiamato","Opinioni non verificate"],correct_index:0,explanation:"La documentazione deve essere oggettiva e utile alla gestione."},
   {prompt:"Quando si chiude l'attività?",options:["Dopo aver verificato la presa in carico e annotato l'esito","Subito dopo la telefonata","Quando si presume che il problema sia risolto"],correct_index:0,explanation:"La chiusura richiede riscontro e registrazione dell'esito."}]},
  {id:"missing_person",title:"Tutela e verifica documentale",scenario:"Nel corso di un'attività istituzionale emerge una discordanza tra due documenti. Non è possibile stabilire subito se si tratti di errore materiale o di anomalia sostanziale.",questions:[
   {prompt:"Come si procede?",options:["Confrontare gli originali o le fonti attendibili e annotare la discordanza","Presumere immediatamente un illecito","Modificare il documento per uniformarlo"],correct_index:0,explanation:"La discordanza va verificata senza anticipare conclusioni."},
   {prompt:"Quale prova è più utile?",options:["Una copia conforme o un riscontro proveniente dall'ente emittente","Una fotografia non leggibile","Un commento informale"],correct_index:0,explanation:"I riscontri devono essere pertinenti, attendibili e tracciabili."},
   {prompt:"Come si formula l'esito?",options:["Separando i fatti accertati dagli aspetti ancora da verificare","Dichiarando una responsabilità senza elementi","Omettendo le incertezze"],correct_index:0,explanation:"La relazione deve distinguere fatti, valutazioni e punti aperti."}]},
  {id:"safe_patrol",title:"Sicurezza e coordinamento del servizio",scenario:"Durante un'attività di supporto, una variazione delle condizioni ambientali rende necessario rivalutare il programma e informare il responsabile.",questions:[
   {prompt:"Qual è la condotta iniziale?",options:["Valutare il rischio, sospendere l'attività non sicura e informare il responsabile","Proseguire comunque per rispettare i tempi","Affidare la decisione a persone non autorizzate"],correct_index:0,explanation:"La sicurezza prevale sulla pianificazione originaria."},
   {prompt:"Come si gestisce la variazione?",options:["Aggiornando il piano e registrando le decisioni","Modificando il piano senza comunicarlo","Cancellando le comunicazioni precedenti"],correct_index:0,explanation:"Le modifiche devono essere coordinate e tracciabili."},
   {prompt:"Quale criterio guida la ripresa?",options:["Riprendere solo dopo nuova valutazione e autorizzazione competente","Riprendere appena possibile senza controlli","Riprendere sulla base di una supposizione"],correct_index:0,explanation:"La ripresa richiede condizioni sicure e autorizzazione."}]}
 ],
 finanza:[
  {id:"academy_orientation",title:"Analisi di documentazione fiscale",scenario:"In un controllo documentale simulato, i dati di un documento commerciale non coincidono con il riepilogo contabile. Non sono ancora disponibili tutti i registri.",questions:[
   {prompt:"Qual è il primo passaggio?",options:["Acquisire i documenti pertinenti e delimitare il periodo da verificare","Presumere subito una frode","Richiedere dati estranei all'oggetto"],correct_index:0,explanation:"L'analisi deve essere pertinente, proporzionata e documentata."},
   {prompt:"Come si valuta la discordanza?",options:["Confrontando fonti, registrazioni e giustificativi prima di concludere","Considerandola prova definitiva da sola","Ignorando le possibili rettifiche"],correct_index:0,explanation:"Una differenza richiede riscontri e contraddittorio secondo le procedure."},
   {prompt:"Che cosa deve contenere il verbale didattico?",options:["Fatti, documenti esaminati, limiti e riscontri mancanti","Conclusioni non supportate","Dati personali non necessari"],correct_index:0,explanation:"La verbalizzazione deve essere oggettiva e verificabile."}]},
  {id:"community_assistance",title:"Tracciabilità delle merci",scenario:"La documentazione di accompagnamento di una spedizione presenta un dato non coerente con l'etichettatura esterna. Il carico non presenta alterazioni evidenti.",questions:[
   {prompt:"Qual è la condotta corretta?",options:["Registrare la difformità e confrontare i dati con i documenti di origine","Dichiarare automaticamente merce illecita","Alterare l'etichetta"],correct_index:0,explanation:"La difformità va verificata con fonti documentali e soggetti competenti."},
   {prompt:"Quale principio guida la verifica?",options:["Tracciabilità e proporzionalità degli accertamenti","Presunzione assoluta di illecito","Raccolta indiscriminata di dati"],correct_index:0,explanation:"Gli accertamenti devono essere pertinenti e proporzionati."},
   {prompt:"Quando si formula una contestazione?",options:["Solo dopo aver raccolto elementi sufficienti e verificabili","Appena emerge una differenza grafica","Sulla base di una voce"],correct_index:0,explanation:"La conclusione deve fondarsi su elementi oggettivi."}]},
  {id:"missing_person",title:"Verifica economico-finanziaria",scenario:"Un prospetto riepilogativo mostra uno scostamento rispetto ai dati dichiarati. Le informazioni disponibili non consentono ancora di ricostruirne la causa.",questions:[
   {prompt:"Come si avvia la verifica?",options:["Individuando periodo, fonti e documenti necessari","Attribuendo subito una responsabilità","Estendendo l'analisi senza motivazione"],correct_index:0,explanation:"La verifica deve avere un perimetro chiaro e documentato."},
   {prompt:"Come si tratta uno scostamento non spiegato?",options:["Come elemento da approfondire, non come prova conclusiva","Come illecito già accertato","Come dato da eliminare"],correct_index:0,explanation:"Lo scostamento richiede ulteriori riscontri."},
   {prompt:"Quale risultato è corretto?",options:["Una ricostruzione con fonti, calcoli e limiti esplicitati","Una stima priva di metodo","Una conclusione senza allegati"],correct_index:0,explanation:"Metodo e fonti rendono l'esito controllabile."}]},
  {id:"safe_patrol",title:"Controllo di settore e tutela del mercato",scenario:"Nel corso di una verifica simulata emergono indicazioni discordanti sull'origine di alcuni prodotti. La documentazione è incompleta.",questions:[
   {prompt:"Qual è la prima azione?",options:["Identificare i prodotti e acquisire la documentazione disponibile","Confiscare senza presupposti","Diffondere l'ipotesi sui social"],correct_index:0,explanation:"La verifica parte dall'identificazione e dalla documentazione."},
   {prompt:"Come si tutela la catena documentale?",options:["Registrando acquisizioni, riferimenti e passaggi","Conservando solo appunti personali","Modificando i dati originali"],correct_index:0,explanation:"La tracciabilità evita alterazioni e contestazioni."},
   {prompt:"Come si conclude?",options:["Distinguendo irregolarità accertate e aspetti da approfondire","Equiparando ogni anomalia a contraffazione","Omettendo gli elementi contrari"],correct_index:0,explanation:"Le conclusioni devono essere equilibrate e fondate."}]}
 ],
 polizia:[
  {id:"academy_orientation",title:"Gestione di una segnalazione",scenario:"La sala operativa riceve una segnalazione di disturbo in un luogo pubblico. Le informazioni iniziali sono parziali e non indicano un pericolo immediato.",questions:[
   {prompt:"Quale informazione va acquisita per prima?",options:["Luogo, natura della segnalazione e presenza di rischi immediati","Dati non pertinenti dei presenti","Conclusioni sul responsabile"],correct_index:0,explanation:"La valutazione iniziale deve basarsi su informazioni utili e verificabili."},
   {prompt:"Come si comunica l'intervento?",options:["Con messaggi chiari, essenziali e tracciabili alla sala operativa","Con canali personali non autorizzati","Senza aggiornare nessuno"],correct_index:0,explanation:"Le comunicazioni istituzionali garantiscono coordinamento."},
   {prompt:"Come si redige la relazione?",options:["Separando dichiarazioni, osservazioni dirette e riscontri","Unendo fatti e supposizioni","Omettendo l'orario"],correct_index:0,explanation:"La distinzione tra fonti è essenziale."}]},
  {id:"community_assistance",title:"Sicurezza della circolazione",scenario:"Un sinistro stradale senza feriti provoca rallentamenti. I conducenti sono collaborativi e la dinamica non è ancora stata ricostruita.",questions:[
   {prompt:"Qual è la priorità?",options:["Mettere in sicurezza l'area e verificare eventuali necessità di soccorso","Attribuire subito la colpa","Spostare i veicoli senza valutare la scena"],correct_index:0,explanation:"La sicurezza e l'assistenza precedono la ricostruzione."},
   {prompt:"Quali dati vanno documentati?",options:["Posizioni, condizioni, dichiarazioni e rilievi pertinenti","Solo le opinioni dei passanti","Dati non collegati al sinistro"],correct_index:0,explanation:"I rilievi devono essere oggettivi e pertinenti."},
   {prompt:"Come si gestiscono le dichiarazioni?",options:["Registrandole come dichiarazioni, senza confonderle con fatti osservati","Presentandole come verità accertate","Omettendole sempre"],correct_index:0,explanation:"Le fonti delle informazioni devono restare distinguibili."}]},
  {id:"missing_person",title:"Segnalazione informatica",scenario:"Un cittadino segnala un possibile accesso non autorizzato al proprio account. Non vi sono ancora elementi che dimostrino una compromissione più ampia.",questions:[
   {prompt:"Qual è il primo consiglio?",options:["Conservare le evidenze e mettere in sicurezza l'account tramite canali ufficiali","Cancellare ogni traccia","Condividere le password con terzi"],correct_index:0,explanation:"Le evidenze vanno preservate e le credenziali protette."},
   {prompt:"Come si valuta la segnalazione?",options:["Raccogliendo tempi, messaggi e indicatori verificabili","Attribuendo l'attacco a un soggetto senza prove","Installando software non verificato"],correct_index:0,explanation:"La valutazione richiede elementi verificabili."},
   {prompt:"Come si procede con i dati?",options:["Seguendo i canali e le procedure istituzionali competenti","Trasferendoli su account personali","Pubblicandoli"],correct_index:0,explanation:"La gestione delle evidenze deve rispettare procedure e riservatezza."}]},
  {id:"safe_patrol",title:"Assistenza a persona vulnerabile",scenario:"Una persona anziana appare disorientata in un luogo pubblico e non riesce a fornire subito informazioni complete.",questions:[
   {prompt:"Qual è la condotta iniziale?",options:["Garantire un contesto sicuro e attivare l'assistenza necessaria","Lasciarla sola","Pressarla con domande non pertinenti"],correct_index:0,explanation:"La tutela della persona viene prima degli adempimenti secondari."},
   {prompt:"Come si raccolgono le informazioni?",options:["Con modalità rispettose, graduali e pertinenti","Con domande suggestive","Diffondendo immagini"],correct_index:0,explanation:"La raccolta deve tutelare dignità e riservatezza."},
   {prompt:"Come si conclude l'attività?",options:["Documentando gli interventi e il soggetto cui è affidata la presa in carico","Senza annotazioni","Con una conclusione non verificata"],correct_index:0,explanation:"La continuità dell'assistenza richiede una presa in carico chiara."}]}
 ],
 esercito:[
  {id:"academy_orientation",title:"Preparazione e sicurezza della missione",scenario:"Prima di un'attività addestrativa, il responsabile rileva una variazione meteo e una dotazione non ancora verificata.",questions:[
   {prompt:"Qual è la decisione corretta?",options:["Rivalutare il rischio e verificare la dotazione prima dell'avvio","Procedere ignorando le variazioni","Dichiarare tutto pronto senza controllo"],correct_index:0,explanation:"La preparazione richiede valutazione del rischio e verifica delle dotazioni."},
   {prompt:"Come si gestisce la dotazione?",options:["Con controllo, registrazione e segnalazione delle anomalie","Con sostituzioni non registrate","Lasciando la verifica al caso"],correct_index:0,explanation:"La tracciabilità logistica è essenziale."},
   {prompt:"Quando si autorizza l'attività?",options:["Quando le condizioni sono ritenute sicure dal responsabile competente","Quando scade l'orario previsto","Senza briefing"],correct_index:0,explanation:"L'attività parte solo dopo una valutazione adeguata."}]},
  {id:"community_assistance",title:"Supporto logistico",scenario:"Una richiesta di materiali per un'esercitazione non coincide con le quantità presenti nel registro di magazzino.",questions:[
   {prompt:"Qual è il primo passo?",options:["Confrontare richiesta, giacenze e registrazioni","Modificare il registro senza riscontro","Ignorare la differenza"],correct_index:0,explanation:"La riconciliazione documentale precede ogni rettifica."},
   {prompt:"Come si gestisce la consegna?",options:["Registrando quantità, responsabile e destinazione","Consegnando senza ricevuta","Usando un elenco non aggiornato"],correct_index:0,explanation:"La consegna deve essere tracciabile."},
   {prompt:"Come si segnala un'anomalia?",options:["Con comunicazione al responsabile logistico e annotazione","Con messaggi informali non verificabili","Senza comunicare"],correct_index:0,explanation:"Le anomalie vanno segnalate attraverso la catena prevista."}]},
  {id:"missing_person",title:"Comunicazioni e coordinamento",scenario:"Durante un'esercitazione, due squadre ricevono versioni differenti dell'orario di un'attività.",questions:[
   {prompt:"Come si risolve la discordanza?",options:["Verificando l'ordine aggiornato con la fonte autorizzata","Scegliendo l'orario più comodo","Procedendo senza coordinamento"],correct_index:0,explanation:"Le informazioni devono provenire da una fonte autorizzata."},
   {prompt:"Che cosa va comunicato?",options:["La versione confermata e l'eventuale annullamento di quella precedente","Solo a una squadra","Informazioni non verificate"],correct_index:0,explanation:"Tutti i destinatari interessati devono ricevere l'aggiornamento."},
   {prompt:"Che cosa si registra?",options:["Orario, fonte e conferma di ricezione","Solo un commento","Nessun dato"],correct_index:0,explanation:"La registrazione evita ambiguità."}]},
  {id:"safe_patrol",title:"Gestione di un inconveniente",scenario:"Un mezzo logistico presenta un'anomalia tecnica prima di un trasferimento programmato.",questions:[
   {prompt:"Qual è la priorità?",options:["Sospendere l'impiego del mezzo e segnalare l'anomalia","Usarlo comunque","Nascondere il difetto"],correct_index:0,explanation:"La sicurezza del personale e del mezzo prevale."},
   {prompt:"Come si procede?",options:["Richiedendo la verifica tecnica e una soluzione autorizzata","Effettuando riparazioni improvvisate","Ignorando il manuale"],correct_index:0,explanation:"Gli interventi tecnici seguono le competenze e le procedure previste."},
   {prompt:"Quando il mezzo torna disponibile?",options:["Dopo verifica e registrazione dell'idoneità","Dopo una semplice dichiarazione verbale","Quando serve"],correct_index:0,explanation:"Il rientro in servizio richiede idoneità documentata."}]}
 ],
 marina:[
  {id:"academy_orientation",title:"Sicurezza della navigazione",scenario:"Durante una navigazione addestrativa viene segnalata una variazione delle condizioni meteo e del traffico marittimo.",questions:[
   {prompt:"Qual è il primo comportamento?",options:["Aggiornare la valutazione della situazione e informare la catena di comando","Mantenere il piano senza rivalutazione","Ignorare gli avvisi"],correct_index:0,explanation:"La sicurezza della navigazione richiede valutazione continua."},
   {prompt:"Come si gestiscono le comunicazioni?",options:["Usando i canali previsti e confermando i messaggi rilevanti","Con dispositivi personali non autorizzati","Senza registrare gli aggiornamenti"],correct_index:0,explanation:"Le comunicazioni di bordo devono essere chiare e tracciabili."},
   {prompt:"Qual è il criterio per proseguire?",options:["La decisione del responsabile dopo aver valutato condizioni e procedure","La sola pressione dei tempi","Una scelta individuale non coordinata"],correct_index:0,explanation:"La decisione compete alla catena di comando."}]},
  {id:"community_assistance",title:"Tutela dell'ambiente marino",scenario:"Viene segnalata una possibile chiazza in mare in prossimità di un'area portuale. L'origine e la natura della sostanza non sono ancora note.",questions:[
   {prompt:"Qual è la prima attività?",options:["Segnalare l'evento e raccogliere informazioni senza formulare ipotesi","Avvicinarsi senza valutare la sicurezza","Dichiarare certa la natura della sostanza"],correct_index:0,explanation:"La segnalazione tempestiva e la sicurezza sono prioritarie."},
   {prompt:"Come si documenta?",options:["Registrando posizione, orario, condizioni e osservazioni","Con immagini prive di riferimenti","Con stime non verificate"],correct_index:0,explanation:"La documentazione deve consentire un riscontro successivo."},
   {prompt:"Chi coordina le attività?",options:["Le autorità e i responsabili competenti secondo le procedure","Qualsiasi soggetto presente","Un singolo senza coordinamento"],correct_index:0,explanation:"La risposta è coordinata dalle autorità competenti."}]},
  {id:"missing_person",title:"Ricerca e soccorso",scenario:"Un'unità segnala una richiesta di assistenza in mare. Le informazioni sulla posizione sono incomplete.",questions:[
   {prompt:"Che cosa occorre acquisire?",options:["Posizione, orario, persone coinvolte e condizioni note","Solo il nome dell'unità","Ipotesi non verificate"],correct_index:0,explanation:"Le informazioni essenziali consentono di coordinare la risposta."},
   {prompt:"Come si gestisce la posizione?",options:["Confermandola e aggiornandola attraverso i canali previsti","Usando coordinate approssimative senza verifica","Diffondendola pubblicamente"],correct_index:0,explanation:"La precisione delle informazioni è fondamentale."},
   {prompt:"Qual è la priorità?",options:["Attivare il coordinamento competente e tutelare le persone","Completare prima la documentazione non urgente","Attendere senza comunicare"],correct_index:0,explanation:"La salvaguardia della vita umana è prioritaria."}]},
  {id:"safe_patrol",title:"Controlli di bordo e dotazioni",scenario:"Nel controllo periodico di una dotazione di sicurezza emerge una registrazione non aggiornata.",questions:[
   {prompt:"Qual è il primo passo?",options:["Verificare fisicamente la dotazione e confrontarla con il registro","Correggere il registro senza controllo","Ignorare la discrepanza"],correct_index:0,explanation:"La verifica incrociata evita errori documentali."},
   {prompt:"Come si gestisce una dotazione non efficiente?",options:["Segnalare e sostituire secondo le procedure","Lasciarla in uso senza avviso","Rimuoverla senza registrazione"],correct_index:0,explanation:"Le dotazioni di sicurezza devono essere efficienti e tracciate."},
   {prompt:"Come si chiude il controllo?",options:["Annotando esito, interventi e responsabile","Solo verbalmente","Senza data"],correct_index:0,explanation:"La registrazione consente controlli successivi."}]}
 ],
 aeronautica:[
  {id:"academy_orientation",title:"Sicurezza del volo",scenario:"Durante la preparazione di una missione addestrativa viene segnalata una discrepanza nella documentazione tecnica.",questions:[
   {prompt:"Qual è la prima condotta?",options:["Sospendere la preparazione interessata e richiedere verifica tecnica","Procedere confidando nella memoria","Correggere il documento senza autorizzazione"],correct_index:0,explanation:"La documentazione tecnica deve essere coerente e verificata."},
   {prompt:"Come si gestisce l'anomalia?",options:["Registrandola e coinvolgendo il personale competente","Omettendola dal registro","Diffondendola su canali personali"],correct_index:0,explanation:"La cultura della sicurezza richiede segnalazione e tracciabilità."},
   {prompt:"Quando si riprende la preparazione?",options:["Dopo la risoluzione e la conferma da parte del responsabile competente","Quando il tempo lo consente","Senza aggiornare la documentazione"],correct_index:0,explanation:"La ripresa richiede conferma formale."}]},
  {id:"community_assistance",title:"Supporto tecnico-logistico",scenario:"Un componente destinato a un'attività addestrativa risulta non disponibile nel sistema di gestione delle risorse.",questions:[
   {prompt:"Qual è il primo passaggio?",options:["Verificare stato, ubicazione e registrazioni del componente","Segnarlo come disponibile senza riscontro","Sostituire il codice"],correct_index:0,explanation:"La disponibilità va verificata attraverso registri e riscontro fisico."},
   {prompt:"Come si documenta il trasferimento?",options:["Con identificativo, responsabile e registrazione aggiornata","Con un messaggio informale","Senza indicare la destinazione"],correct_index:0,explanation:"La tracciabilità è necessaria per la gestione logistica."},
   {prompt:"Come si chiude la segnalazione?",options:["Dopo l'aggiornamento del sistema e la conferma del responsabile","Dopo una supposizione","Senza annotazioni"],correct_index:0,explanation:"La chiusura deve basarsi su una conferma verificabile."}]},
  {id:"missing_person",title:"Briefing e meteorologia",scenario:"Il briefing meteo presenta condizioni variabili che possono incidere sul programma addestrativo.",questions:[
   {prompt:"Qual è la decisione iniziale?",options:["Valutare gli aggiornamenti e informare il responsabile della missione","Ignorare i bollettini","Mantenere il piano per abitudine"],correct_index:0,explanation:"Il briefing deve riflettere le condizioni aggiornate."},
   {prompt:"Quale fonte si utilizza?",options:["Le fonti meteorologiche ufficiali previste dalla procedura","Messaggi non verificati","Previsioni casuali"],correct_index:0,explanation:"Le decisioni si basano su fonti attendibili."},
   {prompt:"Che cosa si registra?",options:["Orario, fonte, condizioni e decisione adottata","Solo una valutazione personale","Nessuna informazione"],correct_index:0,explanation:"La registrazione supporta la sicurezza e la ricostruzione."}]},
  {id:"safe_patrol",title:"Gestione di un'emergenza addestrativa",scenario:"Durante una simulazione addestrativa viene comunicata una condizione che richiede l'interruzione dell'attività e il coordinamento dei supporti.",questions:[
   {prompt:"Qual è la priorità?",options:["Applicare le procedure di sicurezza e informare il coordinamento competente","Proseguire per completare l'esercitazione","Nascondere l'evento"],correct_index:0,explanation:"La sicurezza del personale prevale sull'obiettivo addestrativo."},
   {prompt:"Come si gestiscono le comunicazioni?",options:["Con messaggi essenziali, conferma di ricezione e aggiornamenti","Con comunicazioni non tracciabili","Senza indicare la situazione"],correct_index:0,explanation:"Le comunicazioni devono essere chiare e coordinate."},
   {prompt:"Come si conclude la simulazione?",options:["Con debriefing, registrazione e analisi delle criticità","Cancellando gli eventi","Senza valutazione"],correct_index:0,explanation:"Il debriefing trasforma l'esercitazione in apprendimento."}]}
 ]
};
function publicMissions(branch:string){
 return (MISSION_BANK[branch]??[]).map(({id,title,scenario,questions})=>({id,title,scenario,questions:questions.map(({prompt,options})=>({prompt,options}))}));
}
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
      .select("id,username,display_name,role,active,deleted,matricola,service_branch,initial_rank")
      .eq("id", user.id).maybeSingle();
    if (profileError) return reply(req, { error: "Impossibile leggere il profilo." }, 500);
    if (!profile || !profile.active || profile.deleted) return reply(req, { error: "Account sospeso o disattivato." }, 403);
    let body: any = {};
    try { body = await req.json(); } catch { return reply(req, { error: "Richiesta non valida." }, 400); }
    const branch=String(body.service_branch??"");
    if(!["carabinieri","finanza","polizia","esercito","marina","aeronautica"].includes(branch))return reply(req,{error:"Corpo selezionato non valido."},400);
    const {data:membership,error:membershipError}=await admin.from("profile_memberships").select("role,initial_rank,matricola").eq("user_id",user.id).eq("service_branch",branch).eq("active",true).maybeSingle();
    if(membershipError)return reply(req,{error:"Impossibile verificare l'abilitazione al Corpo."},500);
    if(!membership)return reply(req,{error:"Non sei abilitato per questo Corpo."},403);
    profile.service_branch=branch;profile.initial_rank=membership.initial_rank;profile.role=membership.role;profile.matricola=membership.matricola||"";

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
        completed_missions: completed.data ?? [],
        missions: publicMissions(branch)
      });
    }

    if (body.action === "mission_complete") {
      const missionId = String(body.mission_id ?? "");
      const mission = (MISSION_BANK[branch] ?? []).find(item => item.id === missionId);
      const answers = body.answers;
      if (!mission) return reply(req, { error: "Missione non disponibile per il Corpo selezionato." }, 400);
      if (!Array.isArray(answers) || answers.length !== mission.questions.length || answers.some((a: unknown) => !Number.isInteger(a) || Number(a) < 0 || Number(a) > 3)) {
        return reply(req, { error: "Completa tutte le valutazioni della missione." }, 400);
      }
      const score = answers.reduce((sum:number,answer:number,index:number)=>sum+(answer===mission.questions[index].correct_index?1:0),0);
      if (score !== mission.questions.length) {
        return reply(req, { completed:false,passed:false,score,total:mission.questions.length,message:"Missione non superata. Consulta le spiegazioni e riprova.",review:mission.questions.map((q,index)=>({prompt:q.prompt,explanation:q.explanation,correct_index:q.correct_index})) });
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
      return reply(req, { ...data,passed:true,score,total:mission.questions.length,mission_title:mission.title });
    }

    return reply(req, { error: "Azione non riconosciuta." }, 400);
  } catch (error) {
    console.error("game-engine:", error);
    return reply(req, { error: "Errore temporaneo del simulatore." }, 500);
  }
});
