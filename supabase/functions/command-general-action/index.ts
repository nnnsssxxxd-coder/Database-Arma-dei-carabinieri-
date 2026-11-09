import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(["https://localhost","capacitor://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function hs(req:Request){const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":origins.has(o)?o:"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};}
function out(req:Request,d:unknown,s=200){return new Response(JSON.stringify(d),{status:s,headers:hs(req)});}
const validBranch=(b:string)=>b==="carabinieri"||b==="finanza";
const maxRank=(b:string)=>b==="carabinieri"?23:24;
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:hs(req)});
 if(req.method!=="POST")return out(req,{error:"Metodo non consentito"},405);
 try{
  const auth=req.headers.get("Authorization")??"",caller=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return out(req,{error:"Sessione non valida."},401);
  const {data:actor}=await db.from("command_general_admins").select("username,active").eq("user_id",user.id).maybeSingle();if(!actor?.active)return out(req,{error:"Accesso Ministero non autorizzato."},403);
  const b=await req.json(),action=String(b.action??"");
  const audit=async(event:string,target:string|null,details:Record<string,unknown>={})=>{const {error}=await db.from("command_general_audit").insert({actor_id:user.id,actor_username:actor.username,event,target_user_id:target,details});if(error)throw error;};
  if(action==="list_users"){
   const {data:profiles,error}=await db.from("profiles").select("id,username,display_name,active,deleted,role,matricola").order("username").limit(500);
   if(error)throw error;
   const ids=(profiles??[]).map(p=>p.id);
   const {data:memberships,error:me}=ids.length?await db.from("profile_memberships").select("user_id,service_branch,role,initial_rank,matricola,active").in("user_id",ids):{data:[],error:null};
   if(me)throw me;
   const users=(profiles??[]).map(p=>({...p,profile_memberships:(memberships??[]).filter(m=>m.user_id===p.id)}));
   return out(req,{ok:true,users});
  }
  if(action==="audit_list"){
   const {data,error}=await db.from("command_general_audit").select("*").order("created_at",{ascending:false}).limit(200);if(error)throw error;return out(req,{ok:true,events:data??[]});
  }

  if(action==="create_user"){
   const username=String(b.username??"").trim().toLowerCase(),display=String(b.display_name??"").trim(),password=String(b.password??""),branch=String(b.service_branch??b.branch??"").trim().toLowerCase(),rankRaw=b.initial_rank??b.rank;
   if(!/^[a-z0-9_-]{3,24}$/.test(username))return out(req,{ok:false,error:"Username non valido: usa 3-24 caratteri minuscoli, numeri, _ o -.",field:"username"},400);
   if(display.length<2||display.length>60)return out(req,{ok:false,error:"Nome visualizzato non valido: inserisci da 2 a 60 caratteri.",field:"display_name"},400);
   if(password.length<12||password.length>72)return out(req,{ok:false,error:"Password iniziale non valida: servono 12-72 caratteri.",field:"password"},400);
   if(!validBranch(branch))return out(req,{ok:false,error:"Seleziona un Corpo valido.",field:"service_branch"},400);
   if(rankRaw===undefined||rankRaw===null||String(rankRaw).trim()==="")return out(req,{ok:false,error:"Seleziona il grado iniziale.",field:"initial_rank"},400);
   const rank=Number(rankRaw);if(!Number.isInteger(rank)||rank<0||rank>maxRank(branch))return out(req,{ok:false,error:"Grado non valido per il Corpo selezionato (indice 0-"+maxRank(branch)+").",field:"initial_rank"},400);
   const {data:existsProfile,error:ep}=await db.from("profiles").select("id").eq("username",username).maybeSingle();if(ep)throw ep;if(existsProfile)return out(req,{ok:false,error:"Username già utilizzato.",field:"username"},409);
   const {data:existsMin,error:em}=await db.from("ministry_admins").select("user_id").eq("username",username).maybeSingle();if(em)throw em;if(existsMin)return out(req,{ok:false,error:"Username riservato a un amministratore del Ministero.",field:"username"},409);
   const {data:existsCmd,error:ec}=await db.from("command_general_admins").select("user_id").eq("username",username).maybeSingle();if(ec)throw ec;if(existsCmd)return out(req,{ok:false,error:"Username riservato a un amministratore del Comando Generale.",field:"username"},409);
   const email=username+"@login.simulatore.invalid";
   const {data:created,error:ce}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,display_name:display}});
   if(ce||!created?.user){const duplicate=/already|exists|registered/i.test(ce?.message??"");return out(req,{ok:false,error:duplicate?"Username già utilizzato.":(ce?.message??"Creazione Auth non riuscita."),field:duplicate?"username":"account"},duplicate?409:400);}
   const uid=created.user.id;
   try{
    const {data:profile,error:pr}=await db.from("profiles").select("id,username").eq("id",uid).maybeSingle();if(pr)throw pr;if(!profile)throw new Error("Il trigger Auth non ha creato il profilo: account annullato.");
    const {data:serial,error:se}=await db.from("matricole").insert({user_id:uid}).select("id").single();if(se||!serial)throw se??new Error("Matricola non assegnata.");
    const matricola=(branch==="finanza"?"GF-":"CC-")+String(serial.id).padStart(7,"0");
    const {data:updated,error:ue}=await db.from("profiles").update({display_name:display,service_branch:branch,initial_rank:rank,matricola}).eq("id",uid).select("id").maybeSingle();if(ue)throw ue;if(!updated)throw new Error("Profilo non aggiornato: account annullato.");
    const {error:me}=await db.from("profile_memberships").insert({user_id:uid,service_branch:branch,role:"user",initial_rank:rank,matricola,active:true});if(me)throw me;
    await audit("account_created",uid,{username,display_name:display,service_branch:branch,initial_rank:rank,matricola,provisioning:"auth+profile+membership+matricola"});
    return out(req,{ok:true,username,display_name:display,service_branch:branch,initial_rank:rank,matricola,user_id:uid},201);
   }catch(err){
    console.error("account provisioning rollback",err);
    await db.from("profile_memberships").delete().eq("user_id",uid);await db.from("matricole").delete().eq("user_id",uid);await db.auth.admin.deleteUser(uid);
    const msg=err instanceof Error?err.message:"Errore database durante la creazione.";
    if((err as any)?.code==="23505")return out(req,{ok:false,error:"Username o matricola già presenti: nessun account è stato creato.",field:"username"},409);
    return out(req,{ok:false,error:msg},500);
   }
  }
  if(action==="change_password"){
   const password=String(b.password??"");if(password.length<12||password.length>72)return out(req,{error:"La nuova password deve contenere 12-72 caratteri."},400);
   const {error}=await db.auth.admin.updateUserById(user.id,{password});if(error)throw error;
   const {error:up}=await db.from("command_general_admins").update({must_change_password:false}).eq("user_id",user.id);if(up)throw up;
   await audit("command_password_changed",user.id,{});return out(req,{ok:true});
  }
  const target=String(b.user_id??"");if(!/^[0-9a-f-]{36}$/i.test(target)||target===user.id)return out(req,{error:"Utente non valido."},400);
  const {data:protectedMin,error:pm}=await db.from("ministry_admins").select("user_id").eq("user_id",target).maybeSingle();if(pm)throw pm;if(protectedMin)return out(req,{error:"Il Comando Generale non può modificare account del Ministero."},403);
  const {data:protectedCmd,error:pc}=await db.from("command_general_admins").select("user_id").eq("user_id",target).maybeSingle();if(pc)throw pc;if(protectedCmd)return out(req,{error:"Non è consentito modificare account amministrativi centrali."},403);
  const {data:profile,error:pe}=await db.from("profiles").select("id,username,display_name,active,deleted,matricola,initial_rank").eq("id",target).maybeSingle();if(pe||!profile)return out(req,{error:"Utente non trovato."},404);
  if(action==="change_grade"||action==="set_access"||action==="transfer"){
   const branch=String(b.service_branch??"");if(!validBranch(branch))return out(req,{error:"Corpo non valido."},400);
   if(action==="change_grade"){
    const rank=Number(b.initial_rank);if(!Number.isInteger(rank)||rank<0||rank>maxRank(branch))return out(req,{error:"Grado non valido."},400);
    const {data:membership,error:me}=await db.from("profile_memberships").select("user_id").eq("user_id",target).eq("service_branch",branch).maybeSingle();if(me)throw me;if(!membership)return out(req,{error:"L'utente non risulta associato al Corpo."},409);
    const {error}=await db.from("profile_memberships").update({initial_rank:rank,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",branch);if(error)throw error;
    await audit("grade_changed",target,{username:profile.username,service_branch:branch,initial_rank:rank});return out(req,{ok:true});
   }
   if(action==="set_access"){
    const enabled=b.enabled===true;
    const {data:membership,error:me}=await db.from("profile_memberships").select("user_id,initial_rank,matricola,role").eq("user_id",target).eq("service_branch",branch).maybeSingle();if(me)throw me;
    if(membership){const {error}=await db.from("profile_memberships").update({active:enabled,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",branch);if(error)throw error;}
    else if(enabled){
     const rank=Number.isInteger(Number(b.initial_rank))?Number(b.initial_rank):Number(profile.initial_rank??0);if(rank<0||rank>maxRank(branch))return out(req,{error:"Imposta un grado valido per il Corpo da abilitare."},400);
     const {data:serial,error:se}=await db.from("matricole").select("id").eq("user_id",target).maybeSingle();if(se)throw se;if(!serial)return out(req,{error:"Matricola non disponibile: impossibile abilitare il secondo Corpo in sicurezza."},409);
     const matricola=(branch==="finanza"?"GF-":"CC-")+String(serial.id).padStart(7,"0");
     const {error}=await db.from("profile_memberships").insert({user_id:target,service_branch:branch,role:"user",initial_rank:rank,matricola,active:true});if(error)throw error;
    }
    await audit(enabled?"body_access_enabled":"body_access_disabled",target,{username:profile.username,service_branch:branch});return out(req,{ok:true});
   }
   if(action==="transfer"){
    const from=String(b.from_branch??""),rank=Number(b.initial_rank);if(!validBranch(from)||from===branch||!Number.isInteger(rank)||rank<0||rank>maxRank(branch))return out(req,{error:"Dati trasferimento non validi."},400);
    const {data:old,error:oe}=await db.from("profile_memberships").select("matricola,role,active,initial_rank").eq("user_id",target).eq("service_branch",from).maybeSingle();if(oe)throw oe;if(!old)return out(req,{error:"Appartenenza di origine non trovata."},409);
    const {data:serial,error:se}=await db.from("matricole").select("id").eq("user_id",target).maybeSingle();if(se)throw se;if(!serial)return out(req,{error:"Matricola non disponibile per il trasferimento."},409);
    const targetMatricola=(branch==="finanza"?"GF-":"CC-")+String(serial.id).padStart(7,"0");
    const {data:existing,error:xe}=await db.from("profile_memberships").select("user_id,matricola,role,active,initial_rank").eq("user_id",target).eq("service_branch",branch).maybeSingle();if(xe)throw xe;
    let inserted=false;
    if(existing){const {error}=await db.from("profile_memberships").update({active:true,initial_rank:rank,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",branch);if(error)throw error;}
    else{const {error}=await db.from("profile_memberships").insert({user_id:target,service_branch:branch,role:old.role==="istruttore"?"istruttore":"user",initial_rank:rank,matricola:targetMatricola,active:true});if(error)throw error;inserted=true;}
    const {error:off}=await db.from("profile_memberships").update({active:false,updated_at:new Date().toISOString()}).eq("user_id",target).eq("service_branch",from);
    if(off){if(inserted)await db.from("profile_memberships").delete().eq("user_id",target).eq("service_branch",branch);else await db.from("profile_memberships").update({active:existing!.active,initial_rank:existing!.initial_rank,matricola:existing!.matricola,role:existing!.role}).eq("user_id",target).eq("service_branch",branch);throw off;}
    await audit("body_transfer",target,{username:profile.username,from_branch:from,to_branch:branch,initial_rank:rank,matricola:targetMatricola});return out(req,{ok:true,matricola:targetMatricola});
   }
  }
  if(action==="suspend"||action==="reactivate"){
   const patch=action==="reactivate"?{active:true,deleted:false,updated_at:new Date().toISOString()}:{active:false,updated_at:new Date().toISOString()};
   const {error}=await db.from("profiles").update(patch).eq("id",target);if(error)throw error;
   await audit(action==="suspend"?"account_suspended":"account_reactivated",target,{username:profile.username});return out(req,{ok:true});
  }
  return out(req,{error:"Azione non riconosciuta."},400);
 }catch(e){console.error("command-general-action",e);return out(req,{error:"Operazione non riuscita. Nessuna modifica confermata."},500);}
});