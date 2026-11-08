using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
    static void AutoStart(){ if(FindObjectOfType<GameBootstrap>()==null) new GameObject("GameBootstrap").AddComponent<GameBootstrap>(); }
    void Start()
    {
        Application.targetFrameRate = 60;
        BuildWorld();
        if (FindObjectOfType<SupabaseSession>() == null) { var session=gameObject.AddComponent<SupabaseSession>(); session.config=ScriptableObject.CreateInstance<SupabaseConfig>(); }\n        gameObject.AddComponent<GameHUD>();
    }

    void BuildWorld()
    {
        RenderSettings.ambientLight = new Color(.58f,.62f,.68f);
        var ground = Cube("Piazzale", new Vector3(0,-.25f,0), new Vector3(90,.5f,90), new Color(.30f,.32f,.34f));
        Cube("Caserma - edificio principale", new Vector3(0,4,24), new Vector3(34,8,12), new Color(.72f,.70f,.64f));
        Cube("Ingresso", new Vector3(0,1.5f,17.8f), new Vector3(5,3,.3f), new Color(.22f,.27f,.31f));
        Cube("Ala uffici", new Vector3(-24,3,10), new Vector3(12,6,25), new Color(.66f,.68f,.65f));
        Cube("Autorimessa", new Vector3(24,3,10), new Vector3(16,6,20), new Color(.58f,.61f,.64f));
        Cube("Area addestramento", new Vector3(0,.05f,-24), new Vector3(42,.1f,18), new Color(.40f,.43f,.38f));
        for(int i=0;i<6;i++) Cube("Colonna cortile", new Vector3(-15+i*6,2,15), new Vector3(.35f,4,.35f), Color.white);
        var light = new GameObject("Luce principale").AddComponent<Light>(); light.type=LightType.Directional; light.intensity=1.15f; light.transform.rotation=Quaternion.Euler(48,-32,0);
        var player = GameObject.CreatePrimitive(PrimitiveType.Capsule); player.name="Personaggio"; player.transform.position=new Vector3(0,1,0); player.GetComponent<Renderer>().material.color=new Color(.12f,.22f,.19f);
        player.AddComponent<CharacterController>(); player.AddComponent<ThirdPersonController>();
        var cam = new GameObject("Camera terza persona").AddComponent<Camera>(); cam.tag="MainCamera"; cam.gameObject.AddComponent<AudioListener>(); cam.gameObject.AddComponent<ThirdPersonCamera>().target=player.transform;
    }

    GameObject Cube(string name, Vector3 pos, Vector3 scale, Color color)
    {
        var o=GameObject.CreatePrimitive(PrimitiveType.Cube); o.name=name; o.transform.position=pos; o.transform.localScale=scale; o.GetComponent<Renderer>().material.color=color; return o;
    }
}
