import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGINS = new Set([
  
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
  const {data:admin}=await db.from("profiles").select("username,role,active,deleted,service_branch").eq("id",user.id).maybeSingle();
  if(!admin?.active||admin.deleted)return reply(req,{error:"Account non attivo"},403);
  const body=await req.json(),username=String(body.username??"").trim().toLowerCase(),display_name=String(body.display_name??"").trim(),password=String(body.password??""),service_branch=String(body.service_branch??"").trim().toLowerCase(),rankRaw=body.initial_rank;
  if(!/^[a-z0-9_-]{3,24}$/.test(username))return reply(req,{error:"Username non valido: usa 3-24 caratteri minuscoli, numeri, _ o -.",field:"username"},400);
  if(display_name.length<2||display_name.length>60)return reply(req,{error:"Nome visualizzato non valido: inserisci da 2 a 60 caratteri.",field:"display_name"},400);
  if(password.length<12||password.length>72)return reply(req,{error:"Password iniziale non valida: servono 12-72 caratteri.",field:"password"},400);
  if(!["carabinieri","finanza"].includes(service_branch))return reply(req,{error:"Seleziona un Corpo valido.",field:"service_branch"},400);
  if(rankRaw===undefined||rankRaw===null||String(rankRaw).trim()==="")return reply(req,{error:"Seleziona il grado iniziale.",field:"initial_rank"},400);
  const initial_rank=Number(rankRaw),maxRank=service_branch==="finanza"?24:23;
  if(!Number.isInteger(initial_rank)||initial_rank<0||initial_rank>maxRank)return reply(req,{error:"Grado non valido per il Corpo selezionato (indice 0-"+maxRank+").",field:"initial_rank"},400);
  const {data:creatorMembership,error:cm}=await db.from("profile_memberships").select("role").eq("user_id",user.id).eq("service_branch",service_branch).eq("active",true).maybeSingle();if(cm)throw cm;if(!creatorMembership||creatorMembership.role!=="istruttore")return reply(req,{error:"La creazione è riservata agli istruttori attivi del Corpo selezionato."},403);
  const {data:exists,error:ex}=await db.from("profiles").select("id").eq("username",username).maybeSingle();if(ex)throw ex;if(exists)return reply(req,{error:"Username già utilizzato."},409);
  const email=username+"@login.simulatore.invalid";
  const {data:created,error:createError}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,display_name}});
  if(createError||!created?.user){const duplicate=/already|exists|registered/i.test(createError?.message??"");return reply(req,{error:duplicate?"Username già utilizzato.":(createError?.message??"Creazione account non riuscita.")},duplicate?409:400);}
  const uid=created.user.id;
  try{
   const {data:profile,error:pr}=await db.from("profiles").select("id").eq("id",uid).maybeSingle();if(pr)throw pr;if(!profile)throw new Error("Il trigger Auth non ha creato il profilo.");
   const {data:serial,error:se}=await db.from("matricole").insert({user_id:uid}).select("id").single();if(se||!serial)throw se??new Error("Matricola non assegnata.");
   const matricola=(service_branch==="finanza"?"GF-":"CC-")+String(serial.id).padStart(7,"0");
   const {data:updated,error:ue}=await db.from("profiles").update({display_name,service_branch,initial_rank,matricola}).eq("id",uid).select("id").maybeSingle();if(ue)throw ue;if(!updated)throw new Error("Profilo non aggiornato.");
   const {error:me}=await db.from("profile_memberships").insert({user_id:uid,service_branch,role:"user",initial_rank,matricola,active:true});if(me)throw me;
   const {error:pg}=await db.from("progress").upsert({user_id:uid,service_branch:service_branch,payload:{rank:initial_rank,exp:0,totalExp:0,streak:0,correct:0,history:[],quizCount:0},updated_at:new Date().toISOString()},{onConflict:"user_id,service_branch"});if(pg)throw pg;
   const {error:ae}=await db.from("audit_logs").insert({actor_id:user.id,actor_username:admin.username,event:"account_created",service_branch,details:{username,display_name,initial_rank,matricola}});if(ae)throw ae;
   return reply(req,{ok:true,username,display_name,service_branch,initial_rank,matricola,user_id:uid},201);
  }catch(err){console.error("account provisioning rollback",err);await db.from("progress").delete().eq("user_id",uid);await db.from("profile_memberships").delete().eq("user_id",uid);await db.from("matricole").delete().eq("user_id",uid);await db.auth.admin.deleteUser(uid);const msg=err instanceof Error?err.message:"Errore database durante la creazione.";if((err as any)?.code==="23505")return reply(req,{error:"Username o matricola già presenti: nessun account è stato creato."},409);return reply(req,{error:msg},500);}
 }catch(e){console.error("admin-create-user",e);return reply(req,{error:"Errore durante la creazione dell'account."},500);}
});