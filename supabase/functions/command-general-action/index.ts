import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(["https://nnnsssxxxd-coder.github.io","https://localhost","capacitor://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function headers(req:Request){const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":allowed.has(o)?o:"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};}
function out(req:Request,d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:headers(req)});}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:headers(req)});if(req.method!=="POST")return out(req,{error:"Metodo non consentito"},405);try{
 const auth=req.headers.get("Authorization")??"",caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user}}=await caller.auth.getUser();if(!user)return out(req,{error:"Sessione non valida."},401);
 const {data:actor}=await db.from("command_general_admins").select("username,active").eq("user_id",user.id).maybeSingle();if(!actor?.active)return out(req,{error:"Accesso Comando Generale non autorizzato."},403);
 const b=await req.json(),action=String(b.action??"");

 const audit=async(event:string,target:string|null=null,details:Record<string,unknown>={})=>{const {error}=await db.from("command_general_audit").insert({actor_id:user.id,actor_username:actor.username,event,target_user_id:target,details});if(error)throw error;};
 const validBranch=(v:string)=>v==="carabinieri"||v==="finanza",maxRank=(v:string)=>v==="finanza"?24:23;
 if(action==="change_grade"||action==="set_access"){
  const target=String(b.user_id??""),branch=String(b.service_branch??"");
  if(!/^[0-9a-f-]{36}$/i.test(target)||target===user.id||!validBranch(branch))return out(req,{error:"Dati non validi."},400);
  const {data:protectedAdmin,error:pa}=await db.from("ministry_admins").select("user_id").eq("user_id",target).maybeSingle();if(pa)throw pa;if(protectedAdmin)return out(req,{error:"Il Comando Generale non può modificare account del Ministero."},403);
  const {data:profile,error:pe}=await db.from("profiles").select("username,initial_rank").eq("id",target).maybeSingle();if(pe||!profile)return out(req,{error:"Utente non trovato."},404);
  if(action==="change_grade"){
   const rank=Number(b.initial_rank);if(!Number.isInteger(rank)||rank<0||rank>maxRank(branch))return out(req,{error:"Grado non valido."},400);
   const {data:membership,error:me}=await db.from("profile_memberships").select("user_id").eq("user_id",target).eq("service_branch",branch).maybeSingle();if(me)throw me;if(!membership)return out(req,{error:"Appartenenza non trovata."},409);
   const {error}=await db.from("profile_memberships").update({initial_rank:rank,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",branch);if(error)throw error;
   await audit("coordinated_grade_changed",target,{username:profile.username,service_branch:branch,initial_rank:rank});return out(req,{ok:true});
  }
  const enabled=b.enabled===true;
  const {data:membership,error:me}=await db.from("profile_memberships").select("user_id").eq("user_id",target).eq("service_branch",branch).maybeSingle();if(me)throw me;
  if(membership){const {error}=await db.from("profile_memberships").update({active:enabled,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",branch);if(error)throw error;}
  else if(enabled){
   const rank=Number.isInteger(Number(b.initial_rank))?Number(b.initial_rank):Number(profile.initial_rank??0);if(rank<0||rank>maxRank(branch))return out(req,{error:"Grado iniziale non valido."},400);
   const {data:serial,error:se}=await db.from("matricole").select("id").eq("user_id",target).maybeSingle();if(se)throw se;if(!serial)return out(req,{error:"Matricola non disponibile."},409);
   const matricola=(branch==="finanza"?"GF-":"CC-")+String(serial.id).padStart(7,"0");
   const {error}=await db.from("profile_memberships").insert({user_id:target,service_branch:branch,role:"user",initial_rank:rank,matricola,active:true});if(error)throw error;
  }
  await audit(enabled?"body_access_enabled":"body_access_disabled",target,{username:profile.username,service_branch:branch});return out(req,{ok:true});
 }
 if(action==="list_users"){
  const {data:profiles,error}=await db.from("profiles").select("id,username,display_name,active,deleted,role").order("username").limit(500);
  if(error)throw error;
  const ids=(profiles??[]).map(p=>p.id);
  const {data:memberships,error:me}=ids.length?await db.from("profile_memberships").select("user_id,service_branch,role,initial_rank,matricola,active").in("user_id",ids):{data:[],error:null};
  if(me)throw me;
  const users=(profiles??[]).map(p=>({...p,profile_memberships:(memberships??[]).filter(m=>m.user_id===p.id)}));
  await audit("consulted_user_registry");return out(req,{ok:true,users});
 }
 if(action==="audit_list"){const {data,error}=await db.from("command_general_audit").select("*").order("created_at",{ascending:false}).limit(200);if(error)throw error;return out(req,{ok:true,events:data??[]});}
 if(action==="change_password"){const password=String(b.password??"");if(password.length<12||password.length>72)return out(req,{error:"La nuova password deve contenere 12-72 caratteri."},400);const {error}=await db.auth.admin.updateUserById(user.id,{password});if(error)throw error;const {error:up}=await db.from("command_general_admins").update({must_change_password:false}).eq("user_id",user.id);if(up)throw up;await audit("command_password_changed",user.id);return out(req,{ok:true});}
 return out(req,{error:"Operazione non consentita al Comando Generale o non ancora disponibile."},403);
 }catch(e){console.error("command-general-action",e);return out(req,{error:"Operazione non riuscita."},500);}});
