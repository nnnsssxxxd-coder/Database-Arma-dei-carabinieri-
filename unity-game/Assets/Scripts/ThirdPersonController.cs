using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class ThirdPersonController : MonoBehaviour
{
    public float speed=4.5f, gravity=-18f, turnSpeed=12f;
    CharacterController controller; float vertical;
    void Awake(){controller=GetComponent<CharacterController>();}
    void Update()
    {
        float h=Input.GetAxis("Horizontal"), v=Input.GetAxis("Vertical");
        Vector3 move=new Vector3(h,0,v); if(move.sqrMagnitude>1)move.Normalize();
        var cam=Camera.main; if(cam){var forward=cam.transform.forward;forward.y=0;forward.Normalize();var right=cam.transform.right;right.y=0;right.Normalize();move=forward*v+right*h;}
        if(move.sqrMagnitude>.01f){transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(move),turnSpeed*Time.deltaTime);}
        if(controller.isGrounded&&vertical<0)vertical=-2; vertical+=gravity*Time.deltaTime;
        controller.Move((move*speed+Vector3.up*vertical)*Time.deltaTime);
    }
}
