using UnityEngine;

public static class MobileInput { public static float Horizontal; public static float Vertical; }

[RequireComponent(typeof(CharacterController))]
public class ThirdPersonController : MonoBehaviour
{
    public float speed=4.5f, gravity=-18f, turnSpeed=12f;
    CharacterController controller; float vertical;
    void Awake(){controller=GetComponent<CharacterController>();}
    void Update()
    {
        float h=MobileInput.Horizontal, v=MobileInput.Vertical;
#if ENABLE_LEGACY_INPUT_MANAGER
        h=Input.GetAxis("Horizontal"); v=Input.GetAxis("Vertical");
        if(Mathf.Abs(MobileInput.Horizontal)>.01f || Mathf.Abs(MobileInput.Vertical)>.01f){h=MobileInput.Horizontal;v=MobileInput.Vertical;}
#endif
        Vector3 move=new Vector3(h,0,v); if(move.sqrMagnitude>1)move.Normalize();
        var cam=Camera.main;
        if(cam){var forward=cam.transform.forward;forward.y=0;forward.Normalize();var right=cam.transform.right;right.y=0;right.Normalize();move=forward*v+right*h;}
        if(move.sqrMagnitude>.01f)transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(move),turnSpeed*Time.deltaTime);
        if(controller.isGrounded&&vertical<0)vertical=-2;
        vertical+=gravity*Time.deltaTime;
        controller.Move((move*speed+Vector3.up*vertical)*Time.deltaTime);
    }
}
