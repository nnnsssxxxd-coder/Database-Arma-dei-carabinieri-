-- Additive reference catalogues for the six isolated service environments.
-- Existing Carabinieri and Guardia di Finanza catalogue rows are preserved.
-- This migration does not create simulated credentials or fabricate question banks.
begin;

insert into public.department_catalog (id,name,description,source_url,active,service_branch) values
('cc_scuole','Comando delle Scuole dell’Arma','Articolazione dedicata alla formazione e all’addestramento del personale.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_mobile','Comando Unità Mobili e Specializzate','Comando di vertice delle componenti mobili e specializzate dell’Arma.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_cufaa','Comando Unità Forestali, Ambientali e Agroalimentari','Componente specializzata per tutela forestale, ambientale e agroalimentare.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_nas','Comando Carabinieri per la Tutela della Salute (NAS)','Specialità dedicata alla tutela della salute pubblica e alla vigilanza nei settori di competenza.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_nil','Comando Carabinieri per la Tutela del Lavoro','Specialità dedicata alla vigilanza e alla tutela della normativa lavoristica.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_tpc','Comando Carabinieri per la Tutela del Patrimonio Culturale','Specialità dedicata alla protezione del patrimonio culturale e artistico.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),
('cc_tutela','Reparti per esigenze specifiche','Raggruppa ulteriori articolazioni specialistiche e di supporto previste dall’organizzazione.','https://www.carabinieri.it/chi-siamo/oggi/organizzazione',true,'carabinieri'),

('ps_questure','Questure e Commissariati','Presidi territoriali della Polizia di Stato.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_stradale','Polizia Stradale','Specialità per la vigilanza e la sicurezza della circolazione stradale.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_ferroviaria','Polizia Ferroviaria','Specialità per la sicurezza nelle stazioni e a bordo dei treni.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_frontiera','Polizia di Frontiera','Specialità per i controlli e la sicurezza ai valichi di frontiera.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_postale','Polizia Postale e per la Sicurezza Cibernetica','Specialità per la prevenzione e il contrasto dei reati informatici.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_mobili','Reparti Mobili','Reparti impiegati nei servizi di ordine e sicurezza pubblica.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_scientifica','Polizia Scientifica','Strutture tecnico-scientifiche per gli accertamenti di polizia giudiziaria.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_squadremobili','Squadre Mobili','Uffici investigativi delle Questure.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_prevenzione','Reparti Prevenzione Crimine','Reparti di supporto ai servizi di prevenzione e controllo del territorio.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_uopi','Unità Operative di Primo Intervento','Unità specializzate per interventi ad alto rischio secondo le competenze istituzionali.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),
('ps_immigrazione','Uffici Immigrazione','Uffici territoriali competenti in materia di immigrazione.','https://www.poliziadistato.it/articolo/407618cf8d1cc196741529944',true,'polizia'),

('ei_colmoschin','9° Reggimento d’Assalto Paracadutisti “Col Moschin”','Reparto delle Forze Speciali dell’Esercito.','https://www.esercito.difesa.it/organizzazione/capo-di-sme/comfoter/comando-delle-forze-speciali-dell-esercito/index.html',true,'esercito'),
('ei_185rao','185° Reggimento Paracadutisti Ricognizione Acquisizione Obiettivi','Reparto di ricognizione e acquisizione obiettivi dell’Esercito.','https://www.esercito.difesa.it/organizzazione/capo-di-sme/comfoter/comando-delle-forze-speciali-dell-esercito/index.html',true,'esercito'),
('ei_4alpini','4° Reggimento Alpini Paracadutisti','Reparto alpino paracadutista inserito nel comparto delle Forze Speciali.','https://www.esercito.difesa.it/organizzazione/capo-di-sme/comfoter/comando-delle-forze-speciali-dell-esercito/index.html',true,'esercito'),
('ei_granatieri','1° Reggimento “Granatieri di Sardegna”','Reggimento di fanteria dell’Esercito.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_alpini','8° Reggimento Alpini','Reggimento appartenente alla specialità alpina.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_bersaglieri','1° Reggimento Bersaglieri','Reggimento appartenente alla specialità bersaglieri.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_artiglieria','5° Reggimento Artiglieria Terrestre “Superga”','Reggimento di artiglieria terrestre.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_genio','2° Reggimento Genio Pontieri','Reggimento del genio con capacità di supporto alla mobilità.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_trasmissioni','11° Reggimento Trasmissioni','Reggimento della specialità trasmissioni.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_aves','1° Reggimento AVES “Antares”','Reparto dell’Aviazione dell’Esercito.','https://www.esercito.difesa.it/organizzazione/reggimenti/index.html',true,'esercito'),
('ei_comfordot','Comando per la Formazione, Specializzazione e Dottrina','Comando di vertice per formazione, specializzazione e dottrina.','https://www.esercito.difesa.it/organizzazione/index.html',true,'esercito'),

('mm_squadra','Comando in Capo della Squadra Navale','Comando operativo della componente navale.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_sommergibili','Comando Sommergibili della Marina Militare','Comando della componente sommergibilistica.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_comforpat','Comando delle Forze da Pattugliamento per la Sorveglianza e la Difesa Costiera','Comando della componente di pattugliamento e sorveglianza costiera.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_comsubin','Raggruppamento Subacquei ed Incursori (COMSUBIN)','Reparto specialistico subacqueo e incursori della Marina.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_sanmarco','Brigata Marina San Marco','Componente anfibia della Marina Militare.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_forzeaeree','Comando delle Forze Aeree della Marina','Comando della componente aerea della Marina.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_logistico','Comando Logistico della Marina Militare','Comando per il supporto logistico della Forza Armata.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_scuole','Comando Scuole della Marina Militare','Comando della componente formativa.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_nord','Comando Marittimo Nord','Comando marittimo territoriale.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_sud','Comando Marittimo Sud','Comando marittimo territoriale.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),
('mm_sicilia','Comando Marittimo Sicilia','Comando marittimo territoriale.','https://www.marina.difesa.it/noi-siamo-la-marina/organizzazione/comandi-basi-enti/Pagine/new_home.aspx',true,'marina'),

('am_squadra','Comando della Squadra Aerea','Comando dell’area operativa e addestrativa dell’Aeronautica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_logistico','Comando Logistico dell’Aeronautica Militare','Comando dell’area logistica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_scuole','Comando Scuole dell’Aeronautica Militare / 3ª Regione Aerea','Comando della formazione e dell’area territoriale di competenza.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_regione1','Comando 1ª Regione Aerea','Comando territoriale dell’Aeronautica Militare.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_comaer','Comando Aeronautica Militare Roma','Comando territoriale e di rappresentanza.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_4brigata','4ª Brigata Telecomunicazioni e Sistemi per la Difesa Aerea e l’Assistenza al Volo','Brigata specialistica per telecomunicazioni, difesa aerea e assistenza al volo.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_4stormo','4° Stormo','Stormo dell’organizzazione periferica dell’Aeronautica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_6stormo','6° Stormo','Stormo dell’organizzazione periferica dell’Aeronautica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_32stormo','32° Stormo','Stormo dell’organizzazione periferica dell’Aeronautica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_51stormo','51° Stormo','Stormo dell’organizzazione periferica dell’Aeronautica.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica'),
('am_genio','Reparti Genio e Manutenzione','Reparti di supporto tecnico, infrastrutturale e manutentivo.','https://www.aeronautica.difesa.it/amministrazione-trasparente/organizzazione_2/articolazione_uffici/organizzazione-aeronautica-militare/',true,'aeronautica')
on conflict (id) do nothing;

commit;
