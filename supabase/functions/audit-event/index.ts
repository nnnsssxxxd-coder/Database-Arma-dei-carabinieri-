import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGINS=new Set(["https://nnnsssxxxd-coder.github.io","https://localhost","capacitor://localhost","ionic://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function corsHeadersFor(req:Request){const origin=req.headers.get("Origin")??"";return {...(ALLOWED_ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),"Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};}
function reply(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeadersFor(req),"Content-Type":"application/json","Cache-Control":"no-store"}});}
const url=Deno.env.get("SUPABASE_URL")!;
const anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient=createClient(url,service,{auth:{persistSession:false}});
const allowed=new Set(["session_start","session_end","page_view","quiz_completed","gps_opened"]);
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeadersFor(req)});
 if(req.method!=="POST")return reply(req,{error:"Metodo non consentito"},405);
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")??""}},auth:{persistSession:false}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return reply(req,{error:"Non autenticato"},401);
  const {data:profile}=await adminClient.from("profiles").select("username,active,deleted").eq("id",user.id).maybeSingle();
  if(!profile?.active||profile.deleted)return reply(req,{error:"Account sospeso"},403);
  const body=await req.json();if(!allowed.has(body.event))return reply(req,{error:"Evento non consentito"},400);
  const service_branch=String(body.service_branch??"");
  if(!["carabinieri","finanza"].includes(service_branch))return reply(req,{error:"Corpo non valido"},400);
  const {data:membership}=await adminClient.from("profile_memberships").select("user_id").eq("user_id",user.id).eq("service_branch",service_branch).eq("active",true).maybeSingle();
  if(!membership)return reply(req,{error:"Non sei abilitato per questo Corpo"},403);
  const event=String(body.event);let details:Record<string,unknown>={};
  if(event==="page_view")details={page:String(body.page??"").slice(0,24)};
  if(event==="quiz_completed")details={correct:Math.max(0,Math.min(4,Number(body.correct)||0)),level:Math.max(0,Math.min(17,Number(body.level)||0))};
  if(event==="gps_opened")details={action:String(body.action??"open").slice(0,20)};
  const {error}=await adminClient.from("audit_logs").insert({actor_id:user.id,actor_username:profile.username,event,service_branch,details});
  if(error)throw error;return reply(req,{ok:true});
 }catch(_e){return reply(req,{error:"Registrazione evento non riuscita"},400);}
});