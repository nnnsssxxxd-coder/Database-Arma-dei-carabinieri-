using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

[Serializable] public class LoginRequest { public string username; public string password; }
[Serializable] public class LoginSession { public string access_token; public string refresh_token; }
[Serializable] public class LoginResponse { public LoginSession session; public string error; }
[Serializable] public class UserProfile { public string id; public string username; public string display_name; public string role; public bool active; public bool deleted; public string matricola; public int initial_rank; }
[Serializable] public class ProgressData { public int rank; public int exp; public int totalExp; public int quizCount; public int correct; public int streak; }
[Serializable] public class DepartmentMembership { public string department_id; public int exp; public int rank; public int quiz_count; }
[Serializable] public class DepartmentInfo { public string id; public string name; public string description; }
[Serializable] public class CompletedMission { public string mission_id; public int exp_awarded; public string completed_at; }
[Serializable] public class GameStatusResponse { public UserProfile profile; public ProgressData progress; public DepartmentMembership department_membership; public DepartmentInfo department; public CompletedMission[] completed_missions; }
[Serializable] public class GameActionRequest { public string action; public string mission_id; }
[Serializable] public class MissionResult { public bool completed; public bool duplicate; public int exp_awarded; public ProgressData progress; public string error; }

public class SupabaseSession : MonoBehaviour
{
    public SupabaseConfig config;
    public string AccessToken { get; private set; }
    public UserProfile Profile { get; private set; }
    public ProgressData Progress { get; private set; }
    public DepartmentMembership Membership { get; private set; }
    public DepartmentInfo Department { get; private set; }
    public CompletedMission[] CompletedMissions { get; private set; } = new CompletedMission[0];
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
            if (auth == null || auth.session == null || string.IsNullOrEmpty(auth.session.access_token)) { done(false, auth?.error ?? "Risposta di accesso non valida."); yield break; }
            AccessToken = auth.session.access_token;
        }
        yield return SyncStatus((ok,msg)=>done(ok,msg));
    }

    public IEnumerator SyncStatus(Action<bool,string> done)
    {
        if (!IsLoggedIn && string.IsNullOrEmpty(AccessToken)) { done(false,"Sessione assente."); yield break; }
        var body = JsonUtility.ToJson(new GameActionRequest { action = "status" });
        using (var req = new UnityWebRequest(config.projectUrl + "/functions/v1/game-engine", "POST"))
        {
            req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            req.downloadHandler = new DownloadHandlerBuffer();
            SetAuth(req); req.SetRequestHeader("Content-Type","application/json");
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { done(false,"Sincronizzazione non riuscita. Riprova."); yield break; }
            var status = JsonUtility.FromJson<GameStatusResponse>(req.downloadHandler.text);
            if (status == null || status.profile == null || status.progress == null) { done(false,"Dati ricevuti non validi."); yield break; }
            if (!status.profile.active || status.profile.deleted) { AccessToken=null; Profile=null; done(false,"Account non attivo."); yield break; }
            Profile=status.profile; Progress=status.progress; Membership=status.department_membership; Department=status.department;
            CompletedMissions=status.completed_missions ?? new CompletedMission[0];
        }
        done(true,"Profilo, reparto e progressione sincronizzati.");
    }

    public IEnumerator CompleteMission(string missionId, Action<bool,string,int> done)
    {
        var body=JsonUtility.ToJson(new GameActionRequest { action="mission_complete", mission_id=missionId });
        using (var req=new UnityWebRequest(config.projectUrl+"/functions/v1/game-engine","POST"))
        {
            req.uploadHandler=new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
            req.downloadHandler=new DownloadHandlerBuffer();
            SetAuth(req); req.SetRequestHeader("Content-Type","application/json");
            yield return req.SendWebRequest();
            if(req.result!=UnityWebRequest.Result.Success){done(false,"Missione non registrata. Riprova.",0);yield break;}
            var result=JsonUtility.FromJson<MissionResult>(req.downloadHandler.text);
            if(result==null){done(false,"Risposta missione non valida.",0);yield break;}
            if(result.completed && result.progress!=null) Progress=result.progress;
            done(result.completed,result.duplicate?"Missione già completata: nessuna EXP aggiunta.":(result.completed?"Missione completata!":"Missione non completata."),result.exp_awarded);
        }
    }

    void SetAuth(UnityWebRequest req) { req.SetRequestHeader("apikey",config.publishableKey); req.SetRequestHeader("Authorization","Bearer "+AccessToken); }
}
