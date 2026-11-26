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
 {id:"minor-light",vehicle:"Compatta rossa",plate:"DR 918 FS",driver:"Sara M.",model:"Compatta",situation:"Un fanale posteriore è spento. Il conducente si ferma in sicurezza e collabora; non risultano altre violazioni.",clues:["Luce posteriore non funzionante","Nessun pericolo immediato aggiuntivo","Conducente collaborativo"],action:"avviso",explanation:"Per questa esercitazione didattica è previsto un richiamo con invito alla riparazione, senza inventare altre violazioni."},
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

 ,{id:"cc-child-restraint",vehicle:"Autovettura familiare",plate:"SIM CC-021",driver:"Conducente simulato",model:"Controllo sicurezza passeggeri",situation:"Durante il controllo si accerta che un bambino soggetto all'obbligo viaggia senza il sistema di ritenuta previsto. La circostanza è osservata direttamente.",clues:["Età e condizioni del passeggero verificate","Sistema di ritenuta assente","Circostanza documentata"],action:"sanzione",explanation:"La disciplina dell'art. 172 del Codice della Strada impone i sistemi di ritenuta previsti per i bambini. Nella realtà si applicano le procedure e le verifiche previste."}
 ,{id:"cc-pedestrian-crossing",vehicle:"Berlina scura",plate:"SIM CC-022",driver:"Conducente simulato",model:"Tutela utenti vulnerabili",situation:"La pattuglia osserva il veicolo non fermarsi per consentire il passaggio a un pedone già impegnato sulle strisce, in una situazione in cui la precedenza è dovuta.",clues:["Pedone sulle strisce","Condotta osservata direttamente","Visuale libera"],action:"sanzione",explanation:"L'art. 191 del Codice della Strada disciplina il comportamento verso i pedoni e gli attraversamenti. La contestazione richiede l'accertamento puntuale dei fatti."}
 ,{id:"cc-collision-minor",vehicle:"Furgone compatto",plate:"SIM CC-023",driver:"Conducente simulato",model:"Sinistro stradale",situation:"Due veicoli sono coinvolti in un urto senza feriti apparenti. I conducenti sono collaborativi e la circolazione è parzialmente intralciata.",clues:["Nessun ferito apparente: verificare comunque le condizioni","Veicoli da mettere in sicurezza","Necessario ricostruire la dinamica"],action:"avviso",explanation:"La priorità è mettere in sicurezza l'area, verificare se vi siano feriti e documentare correttamente il sinistro. Non si attribuiscono responsabilità senza accertamenti."}
 ,{id:"cc-stolen-vehicle-alert",vehicle:"SUV grigio",plate:"SIM CC-024",driver:"Conducente simulato",model:"Verifica banca dati",situation:"La consultazione autorizzata restituisce una possibile corrispondenza con una segnalazione di furto, ma alcuni dati identificativi non coincidono perfettamente.",clues:["Corrispondenza non definitiva","Numero identificativo da ricontrollare","Nessun esito ancora confermato"],action:"avviso",explanation:"Una corrispondenza parziale richiede ulteriori verifiche sull'identità del veicolo e il contatto con la centrale. Non va trattata come conferma automatica."}
 ,{id:"cc-unsafe-tyres",vehicle:"Utilitaria blu",plate:"SIM CC-025",driver:"Conducente simulato",model:"Controllo pneumatici",situation:"Uno pneumatico appare visibilmente danneggiato. Non è ancora stata verificata la profondità del battistrada né la gravità tecnica del danno.",clues:["Danno visibile","Misurazione tecnica non ancora eseguita","Condizioni di sicurezza da approfondire"],action:"avviso",explanation:"Occorre approfondire le condizioni del pneumatico e documentare l'eventuale violazione dell'art. 79 C.d.S. Non si formula una contestazione senza gli elementi necessari."}
 ,{id:"cc-overloaded-van",vehicle:"Furgone merci",plate:"SIM CC-026",driver:"Trasportatore simulato",model:"Controllo massa e carico",situation:"Il carico sembra eccedere la capacità del veicolo, ma la massa effettiva non è stata ancora misurata con strumenti idonei.",clues:["Carico apparentemente elevato","Massa effettiva non misurata","Documenti del veicolo disponibili"],action:"avviso",explanation:"La valutazione deve basarsi sui dati tecnici e sulle verifiche di massa previste, non sulla sola impressione visiva."}
 ,{id:"cc-alcohol-suspicion",vehicle:"Station wagon",plate:"SIM CC-027",driver:"Conducente simulato",model:"Accertamento condizioni di guida",situation:"Il conducente manifesta segnali che richiedono un approfondimento sulle condizioni psicofisiche. Non è stato ancora effettuato alcun accertamento strumentale.",clues:["Segnali osservati e descritti","Nessun test eseguito","Necessario seguire la procedura prevista"],action:"avviso",explanation:"Si documentano i fatti e si procede con gli accertamenti consentiti dalla legge e dalle procedure. Non si dichiara una violazione sulla sola impressione."}
 ,{id:"cc-emergency-lane",vehicle:"Autovettura bianca",plate:"SIM CC-028",driver:"Conducente simulato",model:"Corsia di emergenza",situation:"Un veicolo procede sulla corsia di emergenza senza che sia presente una situazione che ne giustifichi l'utilizzo. La condotta è osservata direttamente.",clues:["Uso della corsia di emergenza","Nessuna emergenza apparente","Condotta osservata dalla pattuglia"],action:"sanzione",explanation:"L'utilizzo della corsia di emergenza è disciplinato dall'art. 176 C.d.S. e va valutato sulla base delle circostanze effettivamente accertate."}

 ,{id:"cc-container-seal",vehicle:"Autocarro portacontainer",plate:"SIM CC-031",driver:"Autista simulato",model:"Controllo sigillo container",scene_type:"container",situation:"Nel terminal portuale il numero del sigillo sul container non coincide con quello indicato nella documentazione di trasporto. Il container è integro a vista e non sono ancora disponibili i registri di consegna.",clues:["Numero del sigillo discordante","Integrità esterna da documentare","Catena documentale da ricostruire"],action:"avviso",explanation:"La discordanza richiede documentazione fotografica e riscontri con i soggetti e gli uffici competenti. Non si presume una manomissione senza ulteriori elementi."}
 ,{id:"cc-merchant-ship",vehicle:"Nave mercantile in rada",plate:"SIM CC-032",driver:"Comandante simulato",model:"Segnalazione in ambito portuale",scene_type:"merchant_ship",situation:"Una nave mercantile segnala un'anomalia nella lista dei visitatori imbarcati. Il registro disponibile è incompleto e l'identità di una persona deve ancora essere verificata con le autorità marittime competenti.",clues:["Registro visitatori incompleto","Identità non ancora verificata","Nessun illecito accertato"],action:"avviso",explanation:"Si acquisiscono i dati e si coordinano le verifiche con le autorità competenti. L'incompletezza iniziale non equivale da sola a una responsabilità."}
 ,{id:"cc-small-boat",vehicle:"Imbarcazione da diporto",plate:"SIM CC-033",driver:"Diportista simulato",model:"Controllo documenti unità",scene_type:"boat",situation:"In banchina, il conducente dell'unità non trova subito a bordo un documento richiesto per il caso simulato. La documentazione potrebbe essere disponibile in formato digitale, ma non è stata ancora consultata.",clues:["Documento non esibito al primo controllo","Possibile copia digitale da verificare","Esito documentale non definitivo"],action:"avviso",explanation:"Prima di concludere il controllo si verifica se il documento sia disponibile e valido in altra forma ammessa. Non si sanziona sulla sola mancata esibizione iniziale."}
 ,{id:"cc-shop-delivery",vehicle:"Furgone davanti a un negozio",plate:"SIM CC-034",driver:"Addetto consegne",model:"Consegna e occupazione suolo",scene_type:"shop",situation:"Un furgone effettua una consegna davanti a un esercizio commerciale. La sosta sembra intralciare il passaggio, ma non sono ancora state misurate le distanze né verificate le prescrizioni locali.",clues:["Consegna in corso","Possibile intralcio da misurare","Segnaletica locale da verificare"],action:"avviso",explanation:"Si accertano posizione, segnaletica e intralcio effettivo prima di qualificare la condotta. La sola presenza del mezzo davanti al negozio non prova una violazione."}
 ,{id:"cc-bar-assistance",vehicle:"Area di sosta presso un bar",plate:"SIM CC-035",driver:"Cliente simulato",model:"Richiesta di assistenza",scene_type:"bar",situation:"Il gestore del bar segnala una persona confusa vicino a un veicolo parcheggiato. Non risultano danni né condotte illecite osservate; la persona chiede aiuto per contattare un familiare.",clues:["Richiesta di aiuto","Nessun illecito osservato","Condizioni della persona da verificare"],action:"nessuna_violazione",explanation:"La priorità è l'assistenza e la verifica delle condizioni della persona. Non si formula una contestazione senza una violazione accertata."}
 ,{id:"cc-missing-transport-docs",vehicle:"Furgone per trasporto merci",plate:"SIM CC-036",driver:"Trasportatore simulato",model:"Documenti di trasporto",scene_type:"truck",situation:"Il conducente non riesce a esibire subito il documento di trasporto. La merce e il destinatario sono identificabili, ma il documento potrebbe essere recuperato dal mittente.",clues:["Documento non disponibile al momento","Mittente identificabile","Verifica integrativa possibile"],action:"avviso",explanation:"Si completa il riscontro documentale secondo le norme applicabili al trasporto specifico. Non si presume automaticamente un illecito dalla sola indisponibilità momentanea."}

 ,{id:"cc-van-open-cargo",vehicle:"Furgone per consegne",plate:"SIM CC-037",driver:"Corriere simulato",model:"Verifica vano di carico",scene_type:"van",situation:"Durante il controllo il portellone posteriore del furgone è aperto e sono visibili numerosi pacchi. La lista di consegna riporta 18 colli, mentre sul vano se ne contano 17: occorre ricontare e verificare eventuali scarichi già registrati.",clues:["Portellone aperto e carico visibile","Conteggio fisico non coincidente al primo riscontro","Registro consegne da aggiornare e confrontare"],action:"avviso",explanation:"La differenza iniziale richiede un nuovo conteggio e il confronto con le registrazioni di consegna. Non si presume una sottrazione prima di ricostruire gli scarichi."}
 ,{id:"cc-fuel-flap-open",vehicle:"Autovettura in sosta",plate:"SIM CC-038",driver:"Conducente simulato",model:"Controllo anomalia carburante",scene_type:"fuel",situation:"Un veicolo è fermo in area di servizio con lo sportellino del carburante aperto e il tappo non correttamente avvitato. Non si vede una perdita, ma il conducente deve verificare la chiusura prima di ripartire.",clues:["Sportellino carburante aperto","Nessuna perdita visibile al momento","Veicolo da mettere in sicurezza prima della ripartenza"],action:"avviso",explanation:"Si invita a chiudere correttamente il tappo e si verifica che non vi siano perdite o pericoli. L'anomalia descritta non giustifica da sola una contestazione."}
 ,{id:"cc-container-open-load",vehicle:"Autocarro con container",plate:"SIM CC-039",driver:"Autista simulato",model:"Controllo carico e sigilli",scene_type:"container",situation:"Le porte del container sono aperte durante una sosta autorizzata e il carico è visibile. Il sigillo rimosso è consegnato al responsabile, ma il documento di apertura non è ancora stato acquisito.",clues:["Porte container aperte","Sigillo rimosso ma disponibile","Registrazione dell'apertura da verificare"],action:"avviso",explanation:"Si documenta lo stato del carico e si verifica la registrazione dell'apertura e la catena di custodia. Non si presume una manomissione senza riscontri."}

];
const finanzaScenarios = [
 {id:"gdf-documento-commerciale",vehicle:"Negozio al dettaglio",driver:"Responsabile esercizio",model:"Verifica documentale",situation:"Durante un controllo, l'acquisto è stato pagato ma il documento commerciale non viene emesso. La circostanza è stata verificata e registrata nell'esercitazione.",clues:["Pagamento riscontrato","Documento commerciale non emesso","Circostanza verificata"],action:"sanzione",explanation:"La mancata emissione del documento commerciale, quando dovuto e accertata, richiede la contestazione secondo le procedure e la normativa applicabile."},
 {id:"gdf-trasporto-regolare",vehicle:"Furgone merci",driver:"Autista",model:"Controllo trasporto",situation:"La documentazione di trasporto è presente e coerente con la merce e con i dati del veicolo. Non emergono irregolarità.",clues:["Documenti disponibili","Dati coerenti con il carico","Nessuna anomalia accertata"],action:"nessuna_violazione",explanation:"La documentazione risulta coerente: non si contesta un illecito in assenza di elementi concreti."},
 {id:"gdf-carburante",vehicle:"Autocisterna",driver:"Conducente",model:"Verifica settore carburanti",situation:"La verifica documentale accerta una discordanza tra quantità dichiarata e quantità effettivamente documentata. La discrepanza è stata ricontrollata.",clues:["Quantità dichiarata acquisita","Documenti confrontati","Discordanza confermata"],action:"sanzione",explanation:"Una discrepanza documentale confermata richiede gli approfondimenti e gli atti previsti dalle procedure di competenza."},
 {id:"gdf-marchio-sospetto",vehicle:"Furgone commerciale",driver:"Responsabile carico",model:"Tutela dei prodotti",situation:"Alcuni prodotti presentano un marchio visivamente sospetto, ma non è ancora disponibile una verifica tecnica che confermi la contraffazione.",clues:["Anomalia solo apparente","Nessuna conferma tecnica","Necessario approfondimento specialistico"],action:"nessuna_violazione",explanation:"Il solo sospetto visivo non basta a dichiarare accertata la contraffazione: occorre verificare e documentare prima di procedere."},
 {id:"gdf-prezzi-regolari",vehicle:"Distributore carburanti",driver:"Gestore impianto",model:"Trasparenza prezzi",situation:"I prezzi esposti sono coerenti con quelli applicati e con i dati acquisiti durante il controllo. Non risultano scostamenti.",clues:["Prezzi esposti leggibili","Prezzi applicati coerenti","Nessuna differenza rilevata"],action:"nessuna_violazione",explanation:"I dati risultano coerenti: non va contestata alcuna irregolarità non riscontrata."},
 {id:"gdf-documento-mancante",vehicle:"Veicolo commerciale",driver:"Trasportatore",model:"Verifica documenti",situation:"Per la merce trasportata manca un documento richiesto nel caso didattico; l'assenza è stata verificata e non è stata fornita documentazione sostitutiva.",clues:["Documento richiesto individuato","Assenza verificata","Nessuna documentazione sostitutiva"],action:"sanzione",explanation:"Quando l'obbligo documentale è applicabile e l'assenza è accertata, si procede secondo le competenze e le procedure previste."},
 {id:"gdf-registratore-regolare",vehicle:"Attività commerciale",driver:"Esercente",model:"Verifica corrispettivi",situation:"I dati del registratore telematico e i documenti commerciali esaminati risultano coerenti nel periodo controllato.",clues:["Dati acquisiti correttamente","Documenti confrontati","Nessuna discordanza"],action:"nessuna_violazione",explanation:"La verifica non evidenzia irregolarità: l'esito corretto è non contestare violazioni inesistenti."},
 {id:"gdf-carico-discordante",vehicle:"Autocarro",driver:"Autista",model:"Controllo merci",situation:"La descrizione e la quantità della merce non corrispondono ai documenti esibiti. Il confronto è stato ripetuto e la discordanza permane.",clues:["Merce identificata","Documenti esaminati","Discordanza persistente e documentata"],action:"sanzione",explanation:"Una discordanza documentale confermata va gestita con gli accertamenti e gli atti previsti, senza formulare contestazioni ulteriori non provate."}
 ,{id:"gdf-invoice-discrepancy",vehicle:"Furgone merci",driver:"Trasportatore simulato",model:"Verifica documentazione fiscale",situation:"Nel controllo documentale emergono differenze tra i dati di fattura e la merce esibita. La documentazione è incompleta e occorre acquisire ulteriori elementi.",clues:["Dati non coincidenti","Documentazione da integrare","Nessuna conclusione definitiva"],action:"avviso",explanation:"La discordanza è un elemento da approfondire e verbalizzare. Non si presume automaticamente una violazione fiscale senza gli ulteriori riscontri."}
 ,{id:"gdf-customs-docs",vehicle:"Autocarro telonato",driver:"Autista simulato",model:"Controllo merci e dogana",situation:"Un carico di merci proveniente da un Paese extra-UE è accompagnato da documenti che non consentono ancora di verificare con certezza la corretta posizione doganale.",clues:["Origine dichiarata acquisita","Documenti doganali incompleti","Necessario riscontro con gli uffici competenti"],action:"avviso",explanation:"Occorre verificare la documentazione doganale e la posizione delle merci prima di formulare contestazioni."}
 ,{id:"gdf-tobacco-traceability",vehicle:"Furgone commerciale",driver:"Responsabile carico",model:"Controllo prodotti del tabacco",situation:"Sono rinvenute confezioni di tabacchi lavorati con contrassegni non immediatamente leggibili. Non è ancora stata completata la verifica di autenticità.",clues:["Contrassegni da esaminare","Quantità inventariata","Verifica tecnica non completata"],action:"avviso",explanation:"I prodotti vanno identificati e verificati attraverso i controlli e i canali competenti. Il solo aspetto esteriore non prova la contraffazione."}
 ,{id:"gdf-cash-records",vehicle:"Veicolo aziendale",driver:"Addetto amministrativo",model:"Verifica movimentazioni",situation:"La documentazione disponibile riporta movimenti di denaro non immediatamente riconciliabili con le registrazioni contabili esaminate.",clues:["Movimenti documentati","Registrazioni da confrontare","Mancano elementi per una conclusione"],action:"avviso",explanation:"La discordanza richiede riscontri contabili e documentali, nel rispetto delle competenze e delle procedure. Non si formula un addebito sulla base di un singolo dato."}
 ,{id:"gdf-fuel-excise",vehicle:"Autocisterna",driver:"Conducente simulato",model:"Controllo prodotti energetici",situation:"I documenti di accompagnamento del prodotto energetico presentano una discordanza tra quantità indicata e quantità registrata al punto di carico.",clues:["Documenti acquisiti","Dati di carico confrontati","Discordanza da confermare con i registri"],action:"avviso",explanation:"La verifica deve proseguire sui documenti e sui registri pertinenti prima di definire l'eventuale irregolarità in materia di accise."}
 ,{id:"gdf-sea-documents",vehicle:"Unità da diporto",driver:"Comandante simulato",model:"Controllo in ambito marittimo",situation:"Durante un controllo in mare la documentazione esibita non consente di chiarire subito tutti i dati relativi all'unità e alla navigazione.",clues:["Identificazione dell'unità avviata","Documenti parziali","Ulteriori riscontri necessari"],action:"avviso",explanation:"Si completano le verifiche identificative e documentali previste per il caso concreto, senza presumere una violazione prima dei riscontri."}
 ,{id:"gdf-commercial-receipt",vehicle:"Negozio al dettaglio",driver:"Esercente simulato",model:"Verifica corrispettivi",situation:"Nel controllo viene rilevata una differenza tra un pagamento osservato e il documento commerciale emesso. La differenza è stata verificata con il cliente e con i dati disponibili.",clues:["Pagamento riscontrato","Documento commerciale confrontato","Differenza documentata"],action:"sanzione",explanation:"Quando l'obbligo di certificazione dei corrispettivi è applicabile e la mancata o irregolare emissione è accertata, si procede secondo la normativa e le procedure vigenti."}
 ,{id:"gdf-regular-customs",vehicle:"Autocarro merci",driver:"Autista simulato",model:"Controllo trasporto internazionale",situation:"I documenti di trasporto e doganali sono presenti e coerenti con la merce, con l'origine dichiarata e con i dati del veicolo.",clues:["Documenti completi","Dati coerenti","Nessuna anomalia accertata"],action:"nessuna_violazione",explanation:"Il controllo non ha evidenziato irregolarità: non si contesta alcun illecito in assenza di elementi."}

 ,{id:"gdf-cash-register-gap",vehicle:"Esercizio commerciale",driver:"Esercente simulato",model:"Controllo registratore telematico",situation:"I totali giornalieri del registratore telematico non coincidono con i dati riepilogativi disponibili. Il periodo e i documenti da confrontare sono stati individuati, ma la causa non è ancora chiarita.",clues:["Differenza rilevata","Periodo di riferimento definito","Causa non ancora accertata"],action:"avviso",explanation:"La differenza richiede l'acquisizione e il confronto dei dati e dei documenti pertinenti. Non si presume automaticamente una violazione."}
 ,{id:"gdf-container-seal",vehicle:"Autocarro portacontainer",driver:"Autista simulato",model:"Verifica sigilli e carico",situation:"Il numero del sigillo riportato nei documenti non coincide con quello rilevato sul container. Il controllo deve verificare la documentazione e la catena di custodia.",clues:["Numero sigillo discordante","Documenti acquisiti","Nessuna manomissione ancora accertata"],action:"avviso",explanation:"La discordanza va documentata e approfondita con i soggetti e gli uffici competenti. Non si attribuisce una responsabilità prima dei riscontri."}
 ,{id:"gdf-fuel-pump",vehicle:"Impianto di distribuzione carburanti",driver:"Gestore simulato",model:"Verifica erogazione carburante",situation:"Una verifica preliminare segnala una possibile differenza tra quantità erogata e indicazione del dispositivo. La prova metrologica prevista non è ancora stata completata.",clues:["Segnalazione preliminare","Prova metrologica mancante","Dati da acquisire"],action:"avviso",explanation:"Prima di contestare un'irregolarità occorre completare le verifiche tecniche e documentali previste."}
 ,{id:"gdf-maritime-ais",vehicle:"Pattugliatore",driver:"Comandante simulato",model:"Verifica tracciamento marittimo",situation:"I dati di tracciamento disponibili mostrano un'interruzione temporanea, ma non è ancora stato chiarito se dipenda da copertura, guasto tecnico o condotta intenzionale.",clues:["Interruzione registrata","Causa non accertata","Necessario confronto con registri e apparati"],action:"avviso",explanation:"L'interruzione va verificata con i dati tecnici e documentali prima di formulare valutazioni sull'eventuale inosservanza degli obblighi applicabili."}
 ,{id:"gdf-origin-docs",vehicle:"Furgone refrigerato",driver:"Trasportatore simulato",model:"Verifica origine merce",situation:"Le etichette e i documenti riportano indicazioni di origine non perfettamente coincidenti. Non è ancora disponibile la documentazione completa della filiera.",clues:["Indicazioni non coincidenti","Documentazione di filiera incompleta","Nessuna falsità accertata"],action:"avviso",explanation:"Occorre ricostruire la filiera e verificare i documenti prima di qualificare la condotta come irregolare."}
 ,{id:"gdf-accounting-regular",vehicle:"Veicolo aziendale",driver:"Referente aziendale",model:"Verifica contabile",situation:"Le registrazioni contabili campionate sono coerenti con i documenti esaminati e con le informazioni raccolte durante il controllo.",clues:["Campione documentale coerente","Registrazioni riconciliate","Nessuna anomalia riscontrata"],action:"nessuna_violazione",explanation:"Gli elementi controllati risultano coerenti. Non si formula alcuna contestazione in assenza di irregolarità."}
 ,{id:"gdf-counterfeit-confirmed",vehicle:"Furgone commerciale",driver:"Responsabile carico",model:"Verifica prodotti sospetti",situation:"Un riscontro tecnico dell'autorità competente ha confermato che una partita di prodotti reca segni distintivi contraffatti. La documentazione del riscontro è disponibile.",clues:["Riscontro tecnico acquisito","Partita identificata","Esito documentato"],action:"sanzione",explanation:"A differenza del semplice sospetto, qui è presente un riscontro tecnico documentato. Si procede secondo competenze e procedure applicabili."}
 ,{id:"gdf-transport-compliant",vehicle:"Autocarro",driver:"Autista simulato",model:"Controllo trasporto merci",situation:"La merce, i documenti di trasporto e i dati identificativi del veicolo risultano coerenti. Non emergono discrepanze nel controllo effettuato.",clues:["Carico coerente","Documenti presenti","Dati identificativi corrispondenti"],action:"nessuna_violazione",explanation:"Il controllo non ha evidenziato irregolarità: si conclude senza contestazioni."}

 ,{id:"gdf-container-seal-2",vehicle:"Container su semirimorchio",driver:"Autista simulato",model:"Controllo sigilli e documenti",scene_type:"container",situation:"Il codice del sigillo del container differisce da quello riportato nella dichiarazione di carico. Il documento doganale è parziale e occorre verificare la registrazione del terminal.",clues:["Codice sigillo non coincidente","Dichiarazione parziale","Registro terminal da acquisire"],action:"avviso",explanation:"La difformità va documentata e verificata con i registri e gli uffici competenti prima di ipotizzare una violazione."}
 ,{id:"gdf-merchant-vessel",vehicle:"Nave mercantile",driver:"Agente marittimo simulato",model:"Controllo documenti di bordo",scene_type:"merchant_ship",situation:"La lista di bordo e l'elenco dei componenti dell'equipaggio riportano un nominativo con grafia diversa. I dati identificativi non sono ancora stati confrontati con i documenti originali.",clues:["Difformità anagrafica","Documenti originali non ancora confrontati","Verifica con autorità marittime necessaria"],action:"avviso",explanation:"Si procede con verifica dell'identità e confronto dei documenti. Una differenza di trascrizione non dimostra da sola un'identità falsa."}
 ,{id:"gdf-pleasure-boat",vehicle:"Barca da diporto",driver:"Comandante simulato",model:"Controllo unità e documenti",scene_type:"boat",situation:"Il comandante esibisce i documenti dell'unità, ma non trova immediatamente una ricevuta relativa a un servizio portuale. La ricevuta potrebbe essere archiviata dal gestore.",clues:["Documenti principali esibiti","Ricevuta accessoria mancante","Riscontro con gestore possibile"],action:"avviso",explanation:"Si verifica se la ricevuta sia dovuta e se il gestore possa confermare il pagamento. Non si presume un'omissione sulla base della sola copia non disponibile."}
 ,{id:"gdf-shop-receipt",vehicle:"Negozio al dettaglio",driver:"Esercente simulato",model:"Verifica documento commerciale",scene_type:"shop",situation:"Durante un acquisto di prova il pagamento viene completato, ma il documento commerciale non viene emesso. L'operazione è documentata e il registratore risulta in funzione.",clues:["Pagamento completato","Documento non emesso","Operazione documentata"],action:"sanzione",explanation:"Se l'obbligo di certificazione è applicabile e la mancata emissione è accertata, si procede secondo la disciplina vigente e le procedure di competenza."}
 ,{id:"gdf-bar-cash",vehicle:"Bar e caffetteria",driver:"Gestore simulato",model:"Controllo corrispettivi",scene_type:"bar",situation:"Il totale dei pagamenti elettronici del turno non coincide con il riepilogo del registratore telematico. Non è ancora stato verificato se la differenza dipenda da storni, tempi di contabilizzazione o registrazioni mancanti.",clues:["Totali non coincidenti","Storni da verificare","Causa non accertata"],action:"avviso",explanation:"Si acquisiscono i dati di dettaglio e si confrontano i documenti prima di formulare una contestazione. La differenza contabile da sola non dimostra l'illecito."}
 ,{id:"gdf-missing-invoice",vehicle:"Autocarro con merce",driver:"Trasportatore simulato",model:"Documenti fiscali e di trasporto",scene_type:"truck",situation:"Il trasportatore presenta il documento di trasporto ma non trova la fattura richiamata nella documentazione. Il mittente è identificato e può trasmettere una copia tramite canale verificabile.",clues:["Documento di trasporto presente","Fattura non esibita al momento","Mittente verificabile"],action:"avviso",explanation:"Si verifica quale documentazione sia obbligatoria per l'operazione concreta e si acquisisce il riscontro dal mittente. Non si presume un'evasione dalla sola copia mancante."}

 ,{id:"gdf-van-open-packages",vehicle:"Furgone per consegne commerciali",driver:"Corriere simulato",model:"Riscontro colli e documenti",scene_type:"van",situation:"Il vano del furgone è aperto e i pacchi sono visibili. La distinta indica 24 colli, ma il primo conteggio ne individua 23; il conducente riferisce uno scarico effettuato poco prima, ancora da verificare.",clues:["Vano di carico aperto","Un collo non trovato al primo conteggio","Scarico precedente da verificare"],action:"avviso",explanation:"Si ricostruisce il percorso della consegna e si confrontano distinta, ricevute e registrazioni. La differenza non prova da sola una sottrazione."}
 ,{id:"gdf-fuel-cap-open",vehicle:"Autocisterna in area di servizio",driver:"Conducente simulato",model:"Verifica impianto e chiusure",scene_type:"fuel",situation:"Lo sportello del bocchettone carburante del veicolo di servizio risulta aperto. Non si osservano sversamenti; la documentazione del rifornimento è disponibile ma deve essere confrontata con il registro del mezzo.",clues:["Sportello carburante aperto","Nessuno sversamento osservato","Rifornimento da confrontare con il registro"],action:"avviso",explanation:"Si mette in sicurezza il mezzo e si verifica il registro dei rifornimenti. L'apertura dello sportellino, da sola, non dimostra un illecito."}
 ,{id:"gdf-container-open-goods",vehicle:"Container in area logistica",driver:"Responsabile carico simulato",model:"Controllo carico e documentazione",scene_type:"container",situation:"Il container è aperto e parte della merce è visibile. Alcuni colli riportano etichette non immediatamente corrispondenti alla lista di carico; serve un confronto puntuale tra quantità, codici e documenti.",clues:["Container aperto","Etichette da confrontare","Lista di carico disponibile ma non ancora verificata"],action:"avviso",explanation:"Si effettua un riscontro analitico dei colli e dei documenti. Un'etichetta non coincidente richiede verifica, non una conclusione automatica."}

];
const scenariosByBranch = {carabinieri:scenarios,finanza:finanzaScenarios};
function finanzaSceneType(scenario: any): string {
 if(["shop","bar","fuel_station","merchant_ship","boat","container","fuel","truck","van","business"].includes(String(scenario.scene_type??""))) return String(scenario.scene_type);
 const text=[scenario.vehicle,scenario.model,scenario.situation,...(scenario.clues??[])].join(" ").toLowerCase();
 if(/distributore carburanti|impianto di distribuzione|gestore impianto|pompa carburante|erogatore carburante/.test(text)) return "fuel_station";
 if(/negozio|bar |caffetter|esercizio commercial|attività commercial|punto vendita/.test(text)) return /bar |caffetter/.test(text)?"bar":"shop";
 if(/nave mercantile|unità da diporto|barca|pattugliatore|imbarcazione|porto|banchina|marittim/.test(text)) return /nave mercantile/.test(text)?"merchant_ship":"boat";
 if(/container/.test(text)) return "container";
 if(/autocisterna|carburant|rifornimento/.test(text)) return "fuel";
 if(/furgone|autocarro|trasporto|trasportator|corriere|carico|colli|merci|veicolo commercial|merce trasportata|mezzo commercial/.test(text)) return "truck";
 return "business";
}
function checksForScenario(branch: string, scenario: any) {
 if(branch==="carabinieri") return patrolChecksByBranch.carabinieri;
 const kind=finanzaSceneType(scenario);
 if(kind==="shop"||kind==="bar") return [
  {id:"fiscal_docs",label:"01 · Esame dei documenti fiscali e commerciali"},
  {id:"accounting",label:"02 · Riscontro di pagamenti, corrispettivi e registratore telematico"},
  {id:"inventory",label:"03 · Verifica di prodotti, prezzi esposti e tracciabilità"}
 ];
 if(kind==="fuel_station") return [
  {id:"fiscal_docs",label:"01 · Esame dei documenti fiscali e delle autorizzazioni dell'impianto"},
  {id:"accounting",label:"02 · Confronto tra erogazioni, corrispettivi e registrazioni"},
  {id:"inventory",label:"03 · Verifica di prodotti energetici, prezzi esposti e misurazioni"}
 ];
 if(kind==="fuel") return [
  {id:"fiscal_docs",label:"01 · Esame dei documenti di trasporto e della provenienza del prodotto"},
  {id:"accounting",label:"02 · Riscontro di quantità caricate, scaricate e registrate"},
  {id:"inventory",label:"03 · Verifica del prodotto, dei sigilli e della tracciabilità"}
 ];
 if(kind==="merchant_ship"||kind==="boat") return [
  {id:"fiscal_docs",label:"01 · Esame di manifesti, dichiarazioni e documenti di bordo"},
  {id:"accounting",label:"02 · Riscontro di registri, operazioni e movimenti"},
  {id:"inventory",label:"03 · Verifica di merci, carichi e sigilli"}
 ];
 return [
  {id:"fiscal_docs",label:"01 · Esame dei documenti fiscali, doganali e di trasporto"},
  {id:"accounting",label:"02 · Confronto di registri, quantità dichiarate e operazioni"},
  {id:"inventory",label:"03 · Riscontro di merci, carichi e tracciabilità"}
 ];
}
const patrolChecksByBranch = {
 carabinieri:[{id:"license",label:"01 · Verifica della patente di guida"},{id:"reports",label:"02 · Verifica delle segnalazioni disponibili"},{id:"inspection",label:"03 · Verifica dei dati del veicolo"}],
 finanza:[{id:"fiscal_docs",label:"01 · Esame della documentazione fiscale e commerciale"},{id:"accounting",label:"02 · Riscontro di registri, pagamenti e corrispettivi"},{id:"inventory",label:"03 · Verifica di prodotti, merci e tracciabilità"}]
};
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
  const scenarioPool=scenariosByBranch[branch as keyof typeof scenariosByBranch];
  const {data:profile,error:pe}=await db.from("profiles").select("active,deleted").eq("id",user.id).maybeSingle();
  if(pe||!profile?.active||profile.deleted) return reply(req,{error:"Account non attivo"},403);
  const {data:membership,error:me}=await db.from("profile_memberships").select("user_id").eq("user_id",user.id).eq("service_branch",branch).eq("active",true).maybeSingle();
  if(me||!membership) return reply(req,{error:"Non sei abilitato per questo Corpo."},403);
  if(body.action==="status") {
    const {data:cycle,error}=await db.from("traffic_control_cycles").select("completed_count,cooldown_until").eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    if(error)throw error;
    return reply(req,{completed_count:Number(cycle?.completed_count??0),remaining:Math.max(0,10-Number(cycle?.completed_count??0)),cooldown_until:cycle?.cooldown_until??null});
  }
  if(body.action==="start") {
    const {data:cycle,error:cycleError}=await db.from("traffic_control_cycles").select("completed_count,cooldown_until").eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    if(cycleError)throw cycleError;
    if(cycle?.cooldown_until && new Date(cycle.cooldown_until).getTime()>Date.now()) return reply(req,{error:"Hai completato le 10 prove. Il servizio sarà nuovamente disponibile tra 24 ore.",cooldown_until:cycle.cooldown_until,completed_count:10,remaining:0},429);
    if(Number(cycle?.completed_count??0)>=10 && !cycle?.cooldown_until){const until=new Date(Date.now()+24*60*60*1000).toISOString();const {error:lockError}=await db.from("traffic_control_cycles").update({cooldown_until:until,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("service_branch",branch);if(lockError)throw lockError;return reply(req,{error:"Hai completato le 10 prove. Il servizio sarà nuovamente disponibile tra 24 ore.",cooldown_until:until,completed_count:10,remaining:0},429);}
    if(cycle?.cooldown_until && new Date(cycle.cooldown_until).getTime()<=Date.now()){
      const {error:resetError}=await db.from("traffic_control_cycles").update({completed_count:0,cooldown_until:null,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("service_branch",branch);
      if(resetError)throw resetError;
    }
    const {data:openSession,error:openError}=await db.from("traffic_control_sessions").select("id").eq("user_id",user.id).eq("service_branch",branch).is("completed_at",null).maybeSingle();
    if(openError)throw openError;
    // Una nuova apertura sostituisce il controllo rimasto in sospeso: non riproporre la stessa scena dopo aver riaperto l'app.
    if(openSession){
      const {error:abandonError}=await db.from("traffic_control_sessions")
        .update({completed_at:new Date().toISOString(),is_correct:false,exp_awarded:0})
        .eq("id",openSession.id).eq("user_id",user.id).is("completed_at",null);
      if(abandonError)throw abandonError;
      // Closing an unfinished session increments the cycle through the DB trigger.
      // Re-read the authoritative counter before creating another session.
      const {data:afterAbandon,error:afterAbandonError}=await db.from("traffic_control_cycles")
        .select("completed_count,cooldown_until")
        .eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
      if(afterAbandonError)throw afterAbandonError;
      if(Number(afterAbandon?.completed_count??0)>=10||
        (afterAbandon?.cooldown_until&&new Date(afterAbandon.cooldown_until).getTime()>Date.now())){
        return reply(req,{
          error:"Hai completato le 10 prove. Il servizio sarà nuovamente disponibile tra 24 ore.",
          cooldown_until:afterAbandon?.cooldown_until??null,completed_count:10,remaining:0
        },429);
      }
    }
    const {data:recentSessions,error:recentError}=await db.from("traffic_control_sessions").select("scenario_id").eq("user_id",user.id).eq("service_branch",branch).not("completed_at","is",null).order("started_at",{ascending:false}).limit(10);
    if(recentError)throw recentError;
    const recentIds=new Set((recentSessions??[]).map(row=>row.scenario_id));
    const freshPool=scenarioPool.filter(item=>!recentIds.has(item.id));
    const candidatePool=freshPool.length?freshPool:scenarioPool;
    const scenario=candidatePool[Math.floor(Math.random()*candidatePool.length)];
    const {data:session,error}=await db.from("traffic_control_sessions").insert({
      user_id:user.id,service_branch:branch,scenario_id:scenario.id,correct_action:scenario.action
    }).select("id,expires_at").single();
    if(error) {
      if(error.code==="23505") return reply(req,{error:"Hai già un controllo aperto. Completa il controllo in corso oppure attendi la sua scadenza."},409);
      throw error;
    }
    const {action:correctAction,clues:privateClues,explanation:privateExplanation,...publicScenario}=scenario;
    if(branch==="finanza"){publicScenario.plate="";publicScenario.scene_type=finanzaSceneType(scenario);if(["shop","bar"].includes(publicScenario.scene_type)){publicScenario.driver="Responsabile dell'esercizio";publicScenario.model="Controllo economico-fiscale dell'esercizio";}else if(publicScenario.scene_type==="fuel_station"){publicScenario.driver="Gestore dell'impianto";publicScenario.model="Controllo economico-fiscale dell'impianto";}else if(["boat","merchant_ship"].includes(publicScenario.scene_type)){publicScenario.driver="Comandante dell'unità";}else{publicScenario.driver="Conducente / referente del carico";}}
    const vehicleText=[scenario.vehicle,scenario.model].join(" ");
    const sceneKind=branch==="finanza"?finanzaSceneType(scenario):String(scenario.scene_type??"");
    const imageByScene:Record<string,string>={container:"https://images.unsplash.com/photo-1494412519320-aa613dfb7738?auto=format&fit=crop&w=1200&q=82",merchant_ship:"https://www.aast.edu/en/maritime/img/courses/port-state-audit-scheme-1.jpg",boat:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Heraklion_old_harbour_in_Crete%2C_Greece_003.jpg/1280px-Heraklion_old_harbour_in_Crete%2C_Greece_003.jpg",shop:"https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=82",bar:"https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=82",fuel_station:"https://images.unsplash.com/photo-1727483771218-c1cc488d020c?auto=format&fit=crop&fm=jpg&q=80&w=1200",truck:"https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=1200&q=82"}; const vehicleImage = imageByScene[sceneKind] ?? (/camion|autocisterna|furgone|merci|trasporto/i.test(vehicleText) ? imageByScene.truck : (/barca|battello|pattugliatore|nave|guardacoste|unità da diporto/i.test(vehicleText) ? imageByScene.boat : (branch==="carabinieri" ? "https://www.ilrestodelcarlino.it/image-service/version/c%3AMjdmNzdhZTEtM2M3OS00%3AZTEtM2M3OS00MzI1MzMx/in-azione-i-carabinieri.jpeg" : imageByScene.truck)));
    return reply(req,{session_id:session.id,expires_at:session.expires_at,scenario:{...publicScenario,vehicle_image_url:vehicleImage,checks:checksForScenario(branch,scenario)},service_branch:branch,completed_count:Number(cycle?.completed_count??0),remaining:Math.max(0,10-Number(cycle?.completed_count??0))},201);
  }
  if(body.action==="inspect") {
    const sessionId=String(body.session_id??"");
    const checkId=String(body.check_id??"");
    if(!/^[0-9a-f-]{36}$/i.test(sessionId)||!patrolChecksByBranch[branch as keyof typeof patrolChecksByBranch].some(item=>item.id===checkId))
      return reply(req,{error:"Verifica non valida"},400);
    const {data:session,error:se}=await db.from("traffic_control_sessions")
      .select("id,scenario_id,checks_completed,expires_at,completed_at")
      .eq("id",sessionId).eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    if(se||!session||session.completed_at) return reply(req,{error:"Sessione di controllo non valida"},404);
    if(new Date(session.expires_at).getTime()<Date.now())
      return reply(req,{error:"Tempo del controllo scaduto. Avvia un nuovo servizio."},410);
    const scenario=scenarioPool.find(item=>item.id===session.scenario_id);
    if(!scenario) return reply(req,{error:"Scenario non disponibile"},404);
    const completed=Array.isArray(session.checks_completed)?session.checks_completed:[];
    if(!completed.includes(checkId)) completed.push(checkId);
    const {error:ue}=await db.from("traffic_control_sessions").update({checks_completed:completed})
      .eq("id",sessionId).eq("user_id",user.id);
    if(ue) throw ue;

    const evidence=[String(scenario.situation??""),...(scenario.clues??[])].join(" ");
    let detail="",status="ok";
    if(branch==="finanza"){
      if(checkId==="fiscal_docs"){
        if(/mancan|non esibit|incomplet|discordan|non coincide|assenza verificata|non emess/i.test(evidence)){
          detail="Esame documentale: acquisire e confrontare documenti fiscali, commerciali o di trasporto pertinenti all'operazione.";
          status=/mancanza verificata|assenza verificata|non viene emesso|documento non emesso|discordanza confermata/i.test(evidence)?"bad":"warning";
        }else detail="Esame documentale completato: gli elementi disponibili risultano coerenti con lo scenario.";
      }else if(checkId==="accounting"){
        if(/corrispettiv|registratore telematico|pagamento|fattura|registrazion|movimenti di denaro|prezzi applicati|accise|quantità dichiarata/i.test(evidence)){
          detail="Riscontro economico-contabile: confrontare pagamenti, corrispettivi, registrazioni e quantità dichiarate nel periodo interessato.";
          status=/non coincid|discordan|differenza|mancata emissione|non viene emesso|scostament/i.test(evidence)?(/causa non|non ancora chiar|da verificare|incomplet/i.test(evidence)?"warning":"bad"):"ok";
        }else detail="Riscontro economico-contabile completato: nello scenario non emergono scostamenti documentati.";
      }else{
        if(/merce|carico|colli|sigillo|container|marchio|origine|tabacchi|prodotto|trasporto|autocisterna|prezzi/i.test(evidence)){
          detail="Verifica di prodotti e merci: confrontare quantità, identificativi, origine, prezzi esposti e tracciabilità prima di formulare conclusioni.";
          status=/discordanza persistente e documentata|riscontro tecnico.*confermato|contraffatti|quantità effettivamente documentata/i.test(evidence)?"bad":(/non ancora|da verificare|incomplet|sospett|non coincide|discordan/i.test(evidence)?"warning":"ok");
        }else detail="Verifica di prodotti e merci completata: nessuna anomalia specifica risulta dagli elementi dello scenario.";
      }
    }else if(checkId==="license"){
      if(/senza patente|patente[^.]{0,45}(scadut|revocat|sospes|ritirat|non valida|assent)|patente non valida/i.test(evidence)){
        detail="Patente non regolare: nell'esercitazione risulta un'anomalia da verificare prima di consentire la ripartenza.";
        status="bad";
      } else if(/patente[^.]{0,45}(non esibit|non disponibile|da verificare|non reperibil)|documento[^.]{0,35}(non disponibile|non esibit)/i.test(evidence)){
        detail="Patente non ancora verificata: occorre acquisire il documento e completare il riscontro.";
        status="warning";
      } else {
        detail="Patente verificata nell'esercitazione: valida e coerente con il veicolo.";
      }
    } else if(checkId==="reports"){
      if(/segnalazion|furto|ricercat|alert|precedent|denuncia|corrispondenza sospett/i.test(evidence)){
        detail="È presente un riferimento a una segnalazione recente o a una corrispondenza da approfondire. Verificare i dati con la banca dati simulata.";
        status=/confermat|risulta rubat|segnalazione attiva/i.test(evidence)?"bad":"warning";
      } else {
        detail="Nessuna segnalazione recente risulta nella banca dati della simulazione.";
      }
    } else {
      if(/arma|esplosiv|oggetto pericolos|sostanza stupefacent|materiale pericolos|carico non assicurato|oggetti instabili|rischio per gli altri utenti/i.test(evidence)){
        detail="Controllo veicolo: rilevata una condizione o un elemento potenzialmente pericoloso. Mettere in sicurezza e approfondire il controllo.";
        status="bad";
      } else if(/sospett|anomalia[^.]{0,45}(carico|vano|sigillo)|non coincide|discordanza/i.test(evidence)){
        detail="Controllo veicolo: anomalia da approfondire. Al momento non è confermata la presenza di un oggetto pericoloso.";
        status="warning";
      } else {
        detail="Controllo veicolo completato: nessun oggetto pericoloso rilevato nell'esercitazione.";
      }
    }
    return reply(req,{check_id:checkId,detail,status,completed_checks:completed,all_checked:completed.length>=3});
  }
  if(body.action==="finish") {
    const sessionId=String(body.session_id??"");
    const chosen=String(body.chosen_action??"");
    if(!/^[0-9a-f-]{36}$/i.test(sessionId)) return reply(req,{error:"Sessione non valida"},400);
    const {data,error}=await db.rpc("finish_traffic_control_session",{
      p_session_id:sessionId,p_user_id:user.id,p_service_branch:branch,p_chosen_action:chosen
    });
    if(error) return reply(req,{error:error.message||"Impossibile registrare il controllo."},400);
    const {data:finishedSession}=await db.from("traffic_control_sessions").select("scenario_id").eq("id",sessionId).eq("user_id",user.id).maybeSingle();
    const explanation=scenarioPool.find(item=>item.id===finishedSession?.scenario_id)?.explanation??"";
    const {data:progressRow}=await db.from("progress").select("payload").eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    const {data:cycle,error:cycleError}=await db.from("traffic_control_cycles").select("completed_count,cooldown_until").eq("user_id",user.id).eq("service_branch",branch).maybeSingle();
    return reply(req,{...data,explanation,progress:progressRow?.payload??data.progress??null,
      completed_count:Number(cycle?.completed_count??0),remaining:Math.max(0,10-Number(cycle?.completed_count??0)),
      cooldown_until:cycle?.cooldown_until??null,cycle_summary_available:!cycleError});
  }
  return reply(req,{error:"Azione non riconosciuta"},400);
 } catch(error) {
  console.error("traffic-control-engine",error);
  return reply(req,{error:"Errore temporaneo del servizio. Riprova."},500);
 }
});
