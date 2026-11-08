using UnityEngine;

public class GameHUD : MonoBehaviour
{
    string username="", password="", status="Accedi con le credenziali dell'app originale.";
    SupabaseSession session; bool busy;
    void Start(){session=FindObjectOfType<SupabaseSession>();}
    void OnGUI()
    {
        GUI.skin.label.fontSize=18; GUI.skin.button.fontSize=18; GUI.skin.textField.fontSize=18;
        if(session==null)return;
        if(!session.IsLoggedIn){
            GUILayout.BeginArea(new Rect(20,20,Mathf.Min(Screen.width-40,440),Screen.height-40),"SIMULATORE OPERATIVO 3D","box");
            GUILayout.Label("ACCESSO"); GUILayout.Label("Username"); username=GUILayout.TextField(username);
            GUILayout.Label("Password"); password=GUILayout.PasswordField(password);
            GUI.enabled=!busy;
            if(GUILayout.Button(busy?"ACCESSO...":"ENTRA",GUILayout.Height(48))){busy=true;StartCoroutine(session.Login(username,password,(ok,msg)=>{status=msg;busy=false;}));}
            GUI.enabled=true; GUILayout.Label(status);
            GUILayout.EndArea();
        } else {
            GUILayout.BeginArea(new Rect(15,15,Mathf.Min(Screen.width-30,420),180),"SCHEDA PERSONALE","box");
            GUILayout.Label(session.Profile.display_name+" · "+session.Profile.matricola);
            int rank=Mathf.Clamp(session.Progress.rank,0,RankCatalog.Ranks.Length-1);
            GUILayout.Label("Grado: "+RankCatalog.Ranks[rank]+" · "+RankCatalog.Category(RankCatalog.Ranks[rank]));
            GUILayout.Label("EXP: "+session.Progress.exp);
            GUILayout.Label("Reparto e carriera: sincronizzazione in sviluppo");
            GUILayout.EndArea();
        }
    }
}
