-- Refresh the evidence attached to the Carabinieri vehicle catalogue.
-- The Defender source documents maintenance work in 2026.
-- The Wrangler source documents a 2024 procurement procedure, not current fleet status.

update public.vehicle_brevetto_catalog
set description = 'Veicolo documentato in atti ufficiali di manutenzione dell’Arma nel 2026; la fonte identifica interventi su unità in dotazione.',
    source_url = 'https://www.carabinieri.it/in-vostro-aiuto/amm-trasp/gare-appalto/gare-appalto/cums_20_76_2026',
    source_checked_at = '2026-11-24'
where id = 'cc-defender-110'
  and service_branch = 'carabinieri';

update public.vehicle_brevetto_catalog
set description = 'Modello oggetto di un provvedimento di acquisto per l’Arma nel 2024; la fonte documenta la procedura, non certifica la dotazione attuale.',
    source_url = 'https://www.carabinieri.it/docs/default-source/gareappalto/2024-1/determina-30-del-31-01-2024.pdf',
    source_checked_at = '2026-11-24'
where id = 'cc-jeep-wrangler'
  and service_branch = 'carabinieri';
