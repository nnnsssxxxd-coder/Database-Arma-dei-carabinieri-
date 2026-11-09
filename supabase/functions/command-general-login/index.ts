import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const allowed=new Set(["https://nnnsssxxxd-coder.github.io","https://localhost","capacitor://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function headers(req:Request){const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":allowed.has(o)?o:"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};}
function out(req:Request,d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:headers(req)});}
async function resolveCommandAccess(username:string){
 const {data:existing,error:ae}=await admin.from("command_general_admins").select("user_id,auth_email,display_name,active,must_change_password,username").eq("username",username).maybeSingle();
 if(ae)throw ae;
 if(existing)return existing.active?existing:null;
 const {data:profile,error:pe}=await admin.from("profiles").select("id,username,display_name,active,deleted").eq("username",username).maybeSingle();
 if(pe)throw pe;
 if(!profile||!profile.active||profile.deleted)return null;
 const {data:memberships,error:me}=await admin.from("profile_memberships").select("service_branch,initial_rank,active").eq("user_id",profile.id).eq("active",true);
 if(me)throw me;
 // Indici massimi del catalogo gradi del simulatore: Carabinieri 23, Guardia di Finanza 24.
 const eligible=(memberships??[]).some(m=>(m.service_branch==="carabinieri"&&Number(m.initial_rank)===23)||(m.service_branch==="finanza"&&Number(m.initial_rank)===24));
 if(!eligible)return null;
 const {data:authUser,error:ue}=await admin.auth.admin.getUserById(profile.id);
 if(ue||!authUser?.user?.email)throw ue??new Error("Account Auth senza email associata.");
 const row={user_id:profile.id,username:profile.username,display_name:profile.display_name,auth_email:authUser.user.email,active:true,must_change_password:false};
 const {data:created,error:ce}=await admin.from("command_general_admins").insert(row).select("user_id,auth_email,display_name,active,must_change_password,username").single();
 if(ce)throw ce;
 const {error:ae2}=await admin.from("command_general_audit").insert({actor_id:profile.id,actor_username:profile.username,event:"automatic_command_access_granted",target_user_id:profile.id,details:{reason:"highest_rank_reached",eligibility:"active highest-rank membership",service_branches:(memberships??[]).filter(m=>(m.service_branch==="carabinieri"&&Number(m.initial_rank)===23)||(m.service_branch==="finanza"&&Number(m.initial_rank)===24)).map(m=>m.service_branch)}});
 if(ae2){await admin.from("command_general_admins").delete().eq("user_id",profile.id);throw ae2;}
 return created;
}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:headers(req)});if(req.method!=="POST")return out(req,{error:"Metodo non consentito"},405);try{
 const b=await req.json(),username=String(b.username??"").trim().toLowerCase(),password=String(b.password??"");
 if(!/^[a-z0-9_-]{3,24}$/.test(username)||!password||password.length>128)return out(req,{error:"Credenziali non valide."},400);
 const a=await resolveCommandAccess(username);
 if(!a||!a.active)return out(req,{error:"Credenziali non valide o account non abilitato al Comando Generale."},401);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signInWithPassword({email:a.auth_email,password});
 if(error||!data.session||data.user?.id!==a.user_id)return out(req,{error:"Credenziali non corrette."},401);
 return out(req,{session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token},identity:{username:a.username,display_name:a.display_name,must_change_password:a.must_change_password,authority:"command_general"}});
 }catch(e){console.error("command-general-login",e);return out(req,{error:"Accesso Comando Generale temporaneamente non disponibile."},500);}});
