using UnityEngine;
public class ThirdPersonCamera : MonoBehaviour
{
    public Transform target; public Vector3 offset=new Vector3(0,3.2f,-6f); public float smooth=8f;
    void LateUpdate(){if(!target)return;var desired=target.position+target.rotation*offset;transform.position=Vector3.Lerp(transform.position,desired,smooth*Time.deltaTime);transform.LookAt(target.position+Vector3.up*1.3f);}
}
