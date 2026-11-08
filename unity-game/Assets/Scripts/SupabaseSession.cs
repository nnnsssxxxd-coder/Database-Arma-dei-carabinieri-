using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

[Serializable] public class LoginRequest { public string username; public string password; }
[Serializable] public class LoginResponse { public string access_token; public string refresh_token; public string error; }
[Serializable] public class UserProfile { public string id; public string username; public string display_name; public string role; public bool active; public bool deleted; public string matricola; public int initial_rank; }
[Serializable] public class ProgressEnvelope { public ProgressPayload[] data; }
[Serializable] public class ProgressPayload { public ProgressData payload; }
[Serializable] public class ProgressData { public int rank; public int exp; public int quizCount; public int correct; public int streak; }

public class SupabaseSession : MonoBehaviour
{
    public SupabaseConfig config;
    public string AccessToken { get; private set; }
    public UserProfile Profile { get; private set; }
    public ProgressData Progress { get; private set; }
    public bool IsLoggedIn => !string.IsNullOrEmpty(AccessToken) && Profile != null;

    public IEnumerator Login(string username, string password, Action<bool,string> done)
    {
        if (config == null) { done(false, "Configurazione Supabase mancante."); yield break; }
        var body = JsonUtility.ToJson(new LoginRequest { username = username.Trim().ToLowerInvariant(), password = password });
        using (var req = new UnityWebRequest(config.projectUrl + config.usernameLoginFunction, "POST"))
        {
            req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            req.SetRequestHeader("apikey", config.publishableKey);
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { done(false, "Accesso non riuscito: controlla credenziali e connessione."); yield break; }
            var auth = JsonUtility.FromJson<LoginResponse>(req.downloadHandler.text);
            if (auth == null || string.IsNullOrEmpty(auth.access_token)) { done(false, auth?.error ?? "Risposta di accesso non valida."); yield break; }
            AccessToken = auth.access_token;
        }
        yield return LoadProfile(done);
    }

    IEnumerator LoadProfile(Action<bool,string> done)
    {
        using (var req = UnityWebRequest.Get(config.projectUrl + "/rest/v1/profiles?select=id,username,display_name,role,active,deleted,matricola,initial_rank&id=eq." + UnityWebRequest.EscapeURL(GetUserIdFromJwt(AccessToken))))
        {
            SetAuth(req); yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { done(false, "Impossibile leggere il profilo."); yield break; }
            var json = "{\"data\":" + req.downloadHandler.text + "}";
            var env = JsonUtility.FromJson<ProfileEnvelope>(json);
            if (env?.data == null || env.data.Length == 0 || !env.data[0].active || env.data[0].deleted) { done(false, "Account non attivo."); yield break; }
            Profile = env.data[0];
        }
        using (var req = UnityWebRequest.Get(config.projectUrl + "/rest/v1/progress?select=payload&user_id=eq." + UnityWebRequest.EscapeURL(Profile.id)))
        {
            SetAuth(req); yield return req.SendWebRequest();
            Progress = new ProgressData { rank = Profile.initial_rank };
            if (req.result == UnityWebRequest.Result.Success)
            {
                var env = JsonUtility.FromJson<ProgressEnvelope>("{\"data\":" + req.downloadHandler.text + "}");
                if (env?.data != null && env.data.Length > 0 && env.data[0].payload != null) Progress = env.data[0].payload;
            }
        }
        done(true, "Profilo e progressione sincronizzati.");
    }

    void SetAuth(UnityWebRequest req) { req.SetRequestHeader("apikey", config.publishableKey); req.SetRequestHeader("Authorization", "Bearer " + AccessToken); }
    static string GetUserIdFromJwt(string jwt)
    {
        try { var parts = jwt.Split('.'); var payload = parts[1].Replace('-', '+').Replace('_', '/'); payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '='); var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload)); var marker = "\"sub\":\""; var i = json.IndexOf(marker, StringComparison.Ordinal); if (i < 0) return ""; i += marker.Length; return json.Substring(i, json.IndexOf('"', i) - i); } catch { return ""; }
    }
}
