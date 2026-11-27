-- Equal four-platform catalogues for all six institutions.
-- Sources identify the real platform; the app's learning path is didactic and is not an official qualification.
begin;

insert into public.vehicle_brevetto_catalog
(id,service_branch,display_name,vehicle_domain,description,source_url,source_checked_at,active,sort_order)
values
-- Polizia di Stato
('ps-alfa-tonale','polizia','Alfa Romeo Tonale · veicolo di servizio','land','Autovettura assegnata a servizi della Polizia di Stato; la fonte istituzionale documenta l’assegnazione di nuove auto Tonale.','https://questure.poliziadistato.it/it/Rovigo/articolo/3317698722e87e80c877181599','2026-11-27',true,1),
('ps-lamborghini-temerario','polizia','Lamborghini Temerario · veicolo speciale','land','Vettura destinata a servizi di elevato valore sociale, incluso il trasporto urgente di organi e materiale sanitario.','https://questure.poliziadistato.it/it/Bologna/articolo/33616aa10a07583e0165901125/','2026-11-27',true,2),
('ps-lamborghini-huracan','polizia','Lamborghini Huracán · veicolo speciale','land','Vettura della Polizia Stradale impiegata anche per trasporto urgente di sangue e organi e servizi di sicurezza stradale.','https://questure.poliziadistato.it/it/MonzaedellaBrianza/articolo/223164f3237049fdc799963101','2026-11-27',true,3),
('ps-pullman-azzurro','polizia','Pullman Azzurro · unità mobile educativa','land','Automezzo mobile per educazione stradale e attività di sensibilizzazione della Polizia Stradale.','https://questure.poliziadistato.it/it/Milano/articolo/11946aeae26b3dd9d791436720','2026-11-27',true,4),
-- Esercito Italiano
('ei-vtlm-lince','esercito','VTLM Lince','land','Veicolo tattico leggero multiruolo protetto, descritto nella scheda ufficiale dell’Esercito.','https://www.esercito.difesa.it/equipaggiamenti/veicoli-blindati-e-corazzati-da-combattimento/veicoli-tattici-protetti/veicolo-tattico-leggero-multiruolo-vtlm-lince/81585.html','2026-11-27',true,1),
('ei-vbm-freccia','esercito','VBM 8x8 Freccia','land','Veicolo blindato medio da trasporto truppa, documentato nella scheda ufficiale dell’Esercito.','https://www.esercito.difesa.it/equipaggiamenti/veicoli-blindati-e-corazzati-da-combattimento/veicoli-da-combattimento/vbm-8x8-freccia/81580.html','2026-11-27',true,2),
('ei-centauro','esercito','Blindo armata Centauro','land','Blindo armata utilizzata dai reparti di cavalleria di linea, secondo la scheda ufficiale dell’Esercito.','https://www.esercito.difesa.it/equipaggiamenti/veicoli-blindati-e-corazzati-da-combattimento/veicoli-da-combattimento/blindo-armata-centauro/81754.html','2026-11-27',true,3),
('ei-dardo','esercito','VCC Dardo','land','Veicolo corazzato da combattimento della famiglia dei mezzi ufficialmente elencati dall’Esercito.','https://www.esercito.difesa.it/equipaggiamenti/veicoli-blindati-e-corazzati-da-combattimento/veicoli-da-combattimento/index.html','2026-11-27',true,4),
-- Marina Militare
('mm-sirio','marina','Pattugliatore classe Sirio','naval','Unità navale per vigilanza marittima, tutela ambientale e concorso al soccorso in mare.','https://www.marina.difesa.it/noi-siamo-la-marina/pilastro-operativo/mezzi/forze-navali/Pagine/sirio.aspx','2026-11-27',true,1),
('mm-fremm-carabiniere','marina','Fregata FREMM Carabiniere','naval','Fregata della classe Bergamini, versione antisommergibile, descritta nella scheda ufficiale della Marina Militare.','https://www.marina.difesa.it/noi-siamo-la-marina/pilastro-operativo/mezzi/forze-navali/Pagine/Carabiniere.aspx','2026-11-27',true,2),
('mm-ppa','marina','Pattugliatore Polivalente d’Altura (PPA)','naval','Piattaforma navale multiruolo per sorveglianza marittima, tutela ambientale e concorso al soccorso.','https://www.marina.difesa.it/noi-siamo-la-marina/pilastro-operativo/mezzi/nuovi_progetti_2/Pagine/pattugliatore_polivalente.aspx','2026-11-27',true,3),
('mm-sommergibile-scire','marina','Sommergibile Scirè · classe Todaro U212A','naval','Unità subacquea convenzionale della classe Todaro; percorso limitato a conoscenza generale e sicurezza, senza contenuti operativi riservati.','https://www.marina.difesa.it/noi-siamo-la-marina/pilastro-operativo/mezzi/sottomarini/Pagine/Scir%C3%A8.aspx','2026-11-27',true,4),
-- Aeronautica Militare
('am-c130j','aeronautica','C-130J Hercules II','air','Velivolo da trasporto e aviolancio in servizio presso la 46ª Brigata Aerea, secondo la scheda ufficiale.','https://www.aeronautica.difesa.it/2024/06/21/c-130j-hercules-ii/','2026-11-27',true,1),
('am-t346a','aeronautica','T-346A','air','Velivolo addestratore pre-operativo utilizzato per la fase avanzata di formazione dei piloti.','https://www.aeronautica.difesa.it/2024/06/19/t-346a/','2026-11-27',true,2),
('am-eurofighter','aeronautica','Eurofighter F-2000 Typhoon','air','Velivolo da combattimento per la difesa aerea, presente nel catalogo ufficiale degli aeromobili dell’Aeronautica.','https://www.aeronautica.difesa.it/maf-pagina-velivoli/','2026-11-27',true,3),
('am-hh139','aeronautica','HH-139','air','Elicottero multiruolo impiegato per il soccorso aereo e altre attività istituzionali.','https://www.aeronautica.difesa.it/home/noi-siamo-l-am/personale-e-mezzi/','2026-11-27',true,4)
on conflict (id) do nothing;

commit;
