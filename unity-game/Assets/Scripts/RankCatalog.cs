public static class RankCatalog
{
    // Ordine coerente con la progressione definita nell'app originale.
    public static readonly string[] Ranks = {
        "Carabiniere","Carabiniere Scelto","Appuntato","Appuntato Scelto",
        "Vice Brigadiere","Brigadiere","Brigadiere Capo",
        "Maresciallo","Maresciallo Ordinario","Maresciallo Capo",
        "Maresciallo Maggiore","Luogotenente","Luogotenente Carica Speciale",
        "Sottotenente","Tenente","Capitano","Maggiore","Tenente Colonnello","Colonnello"
    };
    public static string Category(string rank)
    {
        if (string.IsNullOrWhiteSpace(rank)) return "Operatore";
        int index=System.Array.IndexOf(Ranks,rank);
        return index>=0 && index<=12 ? "Sottufficiale" : index>=13 ? "Ufficiale" : "Operatore";
    }
}
