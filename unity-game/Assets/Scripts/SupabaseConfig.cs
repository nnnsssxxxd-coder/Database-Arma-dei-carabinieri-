using UnityEngine;

[CreateAssetMenu(menuName = "Simulatore/Supabase Config")]
public class SupabaseConfig : ScriptableObject
{
    public string projectUrl = "https://rwjrchcorlcvdqzvyafg.supabase.co";
    public string publishableKey = "sb_publishable_0ymp6m0qlOUbtYHIpblirg_L6aZA_VM";
    public string usernameLoginFunction = "/functions/v1/username-login";
}
