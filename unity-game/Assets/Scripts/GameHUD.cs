using UnityEngine;

public class GameHUD : MonoBehaviour
{
    string username="", password="", status="Accedi con le credenziali dell'app originale.";
    SupabaseSession session; bool busy;
    readonly string[] missionIds={"academy_orientation","community_assistance","missing_person","safe_patrol"};
    readonly string[] missionNames={"Orientamento in caserma (+15 EXP)","Assistenza alla comunità (+25 EXP)","Ricerca persona scomparsa (+35 EXP)","Pattuglia di sicurezza (+20 EXP)"};
    void Start(){session=FindObjectOfType<SupabaseSession>();}
    void OnGUI()
    {
        GUI.skin.label.fontSize=16; GUI.skin.button.fontSize=16; GUI.skin.textField.fontSize=18;
        if(session==null)return;
        if(!session.IsLoggedIn){
            GUILayout.BeginArea(new Rect(16,16,Mathf.Min(Screen.width-32,420),Screen.height-32),"SIMULATORE OPERATIVO 3D","box");
            GUILayout.Label("ACCESSO"); GUILayout.Label("Username"); username=GUILayout.TextField(username);
            GUILayout.Label("Password"); password=GUILayout.PasswordField(password);
            GUI.enabled=!busy;
            if(GUILayout.Button(busy?"ACCESSO...":"ENTRA",GUILayout.Height(48))){busy=true;StartCoroutine(session.Login(username,password,(ok,msg)=>{status=msg;busy=false;if(ok)password="";}));}
            GUI.enabled=true; GUILayout.Label(status); GUILayout.EndArea(); return;
        }
        GUILayout.BeginArea(new Rect(12,12,Mathf.Min(Screen.width-24,380),Screen.height-24),"SCHEDA PERSONALE","box");
        GUILayout.Label(session.Profile.display_name+" · "+session.Profile.matricola);
        int rank=Mathf.Clamp(session.Progress.rank,0,RankCatalog.Ranks.Length-1);
        GUILayout.Label("Grado: "+RankCatalog.Ranks[rank]);
        GUILayout.Label("EXP condivise: "+session.Progress.exp+"   Totale: "+session.Progress.totalExp);
        GUILayout.Label("Reparto: "+(session.Department!=null?session.Department.name:"Non assegnato"));
        GUILayout.Space(8); GUILayout.Label("MISSIONI");
        for(int i=0;i<missionIds.Length;i++){
            bool completed=IsCompleted(missionIds[i]);
            GUI.enabled=!busy&&!completed;
            if(GUILayout.Button(completed?missionNames[i]+" · COMPLETATA":missionNames[i],GUILayout.Height(38))){
                busy=true; string id=missionIds[i];
                StartCoroutine(session.CompleteMission(id,(ok,msg,xp)=>{status=msg+(xp>0?" EXP ricevute: "+xp:"");StartCoroutine(session.SyncStatus((syncOk,syncMsg)=>{busy=false;if(!syncOk)status=syncMsg;}));}));
            }
        }
        GUI.enabled=!busy;
        if(GUILayout.Button("SINCRONIZZA DATI")){busy=true;StartCoroutine(session.SyncStatus((ok,msg)=>{status=msg;busy=false;}));}
        GUI.enabled=true; GUILayout.Label(status); GUILayout.EndArea();
        DrawTouchControls();
    }
    bool IsCompleted(string id){foreach(var m in session.CompletedMissions)if(m.mission_id==id)return true;return false;}
    void DrawTouchControls()
    {
        float s=64, x=Screen.width-220, y=Screen.height-150;
        if(GUI.RepeatButton(new Rect(x,y+s,s,s),"◀")) MobileInput.Horizontal=-1; else if(GUI.RepeatButton(new Rect(x+2*s,y+s,s,s),"▶")) MobileInput.Horizontal=1; else MobileInput.Horizontal=0;
        if(GUI.RepeatButton(new Rect(x+s,y,s,s),"▲")) MobileInput.Vertical=1; else if(GUI.RepeatButton(new Rect(x+s,y+2*s,s,s),"▼")) MobileInput.Vertical=-1; else MobileInput.Vertical=0;
    }
}
