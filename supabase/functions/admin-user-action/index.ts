import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGINS = new Set([
  "https://nnnsssxxxd-coder.github.io",
  "https://localhost",
  "capacitor://localhost",
  "http://localhost",
  "http://localhost:8100",
  "https://localhost:8100"
]);
function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
function reply(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,service,{auth:{persistSession:false}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders(req)});
 if(req.method!=="POST")return reply(req,{error:"Metodo non consentito"},405);
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")??""}},auth:{persistSession:false}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return reply(req,{error:"Sessione non valida"},401);
  const {data:admin}=await db.from("profiles").select("role,active,deleted,username").eq("id",user.id).maybeSingle();
  if(!["admin","istruttore"].includes(admin?.role)||!admin.active||admin.deleted)return reply(req,{error:"Permesso negato"},403);
  const body=await req.json(),userId=String(body.user_id??""),action=String(body.action??"");
  if(!/^[0-9a-f-]{36}$/i.test(userId)||userId===user.id)return reply(req,{error:"Account non valido"},400);
  const {data:target}=await db.from("profiles").select("username,role").eq("id",userId).maybeSingle();
  if(!target||["admin","istruttore"].includes(target.role))return reply(req,{error:"Account non gestibile"},404);
  if(action==="reset_password"){
   const password=String(body.password??"");
   if(password.length<12||password.length>72)return reply(req,{error:"La password deve contenere da 12 a 72 caratteri"},400);
   const {error}=await db.auth.admin.updateUserById(userId,{password});if(error)throw error;
   await db.from("audit_logs").insert({actor_id:user.id,actor_username:admin.username,event:"password_reset",details:{username:target.username}});
   return reply(req,{ok:true});
  }
  if(!["suspend","reactivate","remove"].includes(action))return reply(req,{error:"Azione non consentita"},400);
  const patch=action==="suspend"?{active:false}:action==="reactivate"?{active:true,deleted:false}:{active:false,deleted:true};
  const {error}=await db.from("profiles").update(patch).eq("id",userId);if(error)throw error;
  const event=action==="suspend"?"account_suspended":action==="reactivate"?"account_reactivated":"account_removed";
  const {error:auditError}=await db.from("audit_logs").insert({actor_id:user.id,actor_username:admin.username,event,details:{username:target.username}});
  if(auditError)console.error("audit user action",auditError.message);
  return reply(req,{ok:true});
 }catch(e){console.error("admin-user-action",e);return reply(req,{error:"Operazione non riuscita"},500);}
});