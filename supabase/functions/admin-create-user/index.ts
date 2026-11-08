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
  const auth=req.headers.get("Authorization")??"";
  const caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user}}=await caller.auth.getUser();
  if(!user)return reply(req,{error:"Sessione non valida"},401);
  const {data:admin}=await db.from("profiles").select("username,role,active,deleted").eq("id",user.id).maybeSingle();
  if(!["admin","istruttore"].includes(admin?.role)||!admin.active||admin.deleted)return reply(req,{error:"Solo un istruttore o amministratore può creare account"},403);
  const body=await req.json();
  const username=String(body.username??"").trim().toLowerCase();
  const display_name=String(body.display_name??"").trim();
  const password=String(body.password??"");
  const initial_rank=Number(body.initial_rank??0);
  if(!/^[a-z0-9_-]{3,24}$/.test(username))return reply(req,{error:"Username non valido: usa 3-24 caratteri, lettere minuscole, numeri, _ o -."},400);
  if(display_name.length<1||display_name.length>60)return reply(req,{error:"Il nome deve contenere da 1 a 60 caratteri."},400);
  if(password.length<12||password.length>72)return reply(req,{error:"La password deve contenere da 12 a 72 caratteri."},400);
  if(!Number.isInteger(initial_rank)||initial_rank<0||initial_rank>17)return reply(req,{error:"Grado iniziale non valido."},400);
  const email=username+"@login.simulatore.invalid";
  const {data:created,error:createError}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,display_name}});
  if(createError||!created.user)return reply(req,{error:createError?.message??"Creazione account non riuscita"},400);
  const {data:serial,error:serialError}=await db.from("matricole").insert({user_id:created.user.id}).select("id").single();
  if(serialError){await db.auth.admin.deleteUser(created.user.id);return reply(req,{error:"Non è stato possibile assegnare la matricola."},500);}
  const matricola="CC-"+String(serial.id).padStart(7,"0");
  const {error:profileError}=await db.from("profiles").update({display_name,matricola,initial_rank}).eq("id",created.user.id);
  if(profileError){await db.from("matricole").delete().eq("user_id",created.user.id);await db.auth.admin.deleteUser(created.user.id);return reply(req,{error:"Non è stato possibile completare il profilo."},500);}
  const {error:auditError}=await db.from("audit_logs").insert({actor_id:user.id,actor_username:admin.username,event:"account_created",details:{username,initial_rank,matricola}});
  if(auditError)console.error("audit account_created",auditError.message);
  return reply(req,{ok:true,username,matricola,user_id:created.user.id});
 }catch(e){console.error("admin-create-user",e);return reply(req,{error:"Errore durante la creazione dell'account."},500);}
});