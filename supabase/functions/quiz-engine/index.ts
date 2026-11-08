import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGINS=new Set(["https://nnnsssxxxd-coder.github.io","https://localhost","capacitor://localhost","ionic://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function corsHeadersFor(req:Request){const origin=req.headers.get("Origin")??"";return {...(ALLOWED_ORIGINS.has(origin)?{"Access-Control-Allow-Origin":origin}:{}),"Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400"};}
function reply(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeadersFor(req),"Content-Type":"application/json","Cache-Control":"no-store"}});}
const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,service,{auth:{persistSession:false}});
const WINDOW_MS=24*60*60*1000, SESSION_MS=45*60*1000;
async function questionPool(category:string){
 let request=db.from("quiz_questions").select("id,prompt,options,category,difficulty").eq("active",true);
 if(category!=="Tutte le materie")request=request.eq("category",category);
 return await request.order("sort_order");
}
async function cooldownFor(userId:string,category:string){
 const {data:pool,error:poolError}=await questionPool(category);
 if(poolError||!pool)return {error:true,available:0,cooldown_until:null};
 if(pool.length<4)return {error:false,available:pool.length,too_few:true,cooldown_until:null};
 const since=new Date(Date.now()-WINDOW_MS).toISOString();
 const {data:recent,error}=await db.from("quiz_attempts").select("question_ids,completed_at")
  .eq("user_id",userId).not("completed_at","is",null).gte("completed_at",since).order("completed_at",{ascending:true});
 if(error)return {error:true,available:0,cooldown_until:null};
 const used=new Set<string>();for(const a of recent||[])for(const id of a.question_ids||[])used.add(id);
 const available=pool.filter(q=>!used.has(q.id)).length;
 if(available>=4)return {error:false,available,cooldown_until:null};
 const releaseTimes=[...new Set((recent||[]).map(a=>new Date(a.completed_at).getTime()+WINDOW_MS))].sort((a,b)=>a-b);
 let cooldown=null;
 for(const release of releaseTimes){
  const stillUsed=new Set<string>();
  for(const a of recent||[])if(new Date(a.completed_at).getTime()>release-WINDOW_MS)for(const id of a.question_ids||[])stillUsed.add(id);
  if(pool.filter(q=>!stillUsed.has(q.id)).length>=4){cooldown=release;break;}
 }
 return {error:false,available,cooldown_until:cooldown?new Date(cooldown).toISOString():null};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeadersFor(req)});
 if(req.method!=="POST")return reply(req,{error:"Metodo non consentito"},405);
 try{
  const caller=createClient(url,anon,{global:{headers:{Authorization:req.headers.get("Authorization")??""}},auth:{persistSession:false}});
  const {data:{user}}=await caller.auth.getUser();if(!user)return reply(req,{error:"Sessione non valida"},401);
  const {data:profile}=await db.from("profiles").select("active,deleted").eq("id",user.id).maybeSingle();
  if(!profile?.active||profile.deleted)return reply(req,{error:"Account non attivo"},403);
  const body=await req.json();
  const allowed=["Arma e ordinamento","Costituzione e istituzioni","Diritto penale e procedura"];
  const category=String(body.category??"Tutte le materie");
  if(category!=="Tutte le materie"&&!allowed.includes(category))return reply(req,{error:"Materia non valida"},400);
  if(body.action==="rank_exam_start"){
   const {data:row}=await db.from("progress").select("payload").eq("user_id",user.id).maybeSingle();
   const {data:prof}=await db.from("profiles").select("initial_rank").eq("id",user.id).single();
   const payload=row?.payload||{},rank=Math.max(Number(payload.rank)||0,Number(prof?.initial_rank)||0),exp=Math.max(0,Number(payload.exp)||0);
   const need=Math.round((250+rank*60+rank*rank*4)/10)*10;
   if(rank>=17)return reply(req,{error:"Hai già raggiunto il livello massimo."},409);
   if(exp<need)return reply(req,{error:"Per accedere all'esame servono ancora "+(need-exp)+" EXP.",required:need,exp,rank},403);
   const bands=rank<5?["Arma e ordinamento"]:rank<11?["Arma e ordinamento","Costituzione e istituzioni"]:allowed;
   const {data:pool,error}=await db.from("quiz_questions").select("id,prompt,options,category,difficulty").eq("active",true).in("category",bands);
   if(error||!pool||pool.length<5)return reply(req,{error:"Banca dati insufficiente per creare l'esame."},500);
   const shuffled=[...pool];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const selected=shuffled.slice(0,5);
   const {data:attempt,error:insertError}=await db.from("rank_exam_attempts").insert({user_id:user.id,from_rank:rank,question_ids:selected.map(q=>q.id)}).select("id,started_at").single();
   if(insertError)return reply(req,{error:"Impossibile avviare l'esame."},500);
   return reply(req,{attempt_id:attempt.id,rank,questions:selected,expires_at:new Date(new Date(attempt.started_at).getTime()+20*60*1000).toISOString(),required:need});
  }
  if(body.action==="rank_exam_submit"){
   const attemptId=String(body.attempt_id??""),answers=body.answers;
   if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!Array.isArray(answers)||answers.length!==5||answers.some((a:any)=>!Number.isInteger(a)||a<0||a>3))return reply(req,{error:"Risposte non valide."},400);
   const {data,error}=await db.rpc("complete_rank_exam",{p_user_id:user.id,p_attempt_id:attemptId,p_answers:answers});
   if(error){const code=error.code==="23505"?409:error.code==="42501"?403:400;return reply(req,{error:error.message==="Esame già consegnato"?"Questo esame è già stato consegnato":error.message==="Esame scaduto"?"Il tempo dell'esame è scaduto.":error.message==="Non hai ancora raggiunto i requisiti EXP"?"Non hai ancora raggiunto gli EXP richiesti.":error.message},code);}
   return reply(data);
  }
  if(body.action==="status"){
   const status=await cooldownFor(user.id,category);
   if(status.error)return reply(req,{error:"Impossibile verificare il ripristino delle domande"},500);
   return reply(status);
  }
  if(body.action==="start"){
   await db.from("quiz_attempts").update({answers:[],score:0,exp_awarded:0,completed_at:new Date().toISOString()})
    .eq("user_id",user.id).is("completed_at",null).lt("started_at",new Date(Date.now()-SESSION_MS).toISOString());
   const {data:open}=await db.from("quiz_attempts").select("id,question_ids,started_at,answers")
    .eq("user_id",user.id).is("completed_at",null).order("started_at",{ascending:false}).limit(1).maybeSingle();
   if(open){
    const {data:rows,error}=await db.from("quiz_questions").select("id,prompt,options,category,difficulty").in("id",open.question_ids);
    if(error||!rows)return reply(req,{error:"Impossibile riprendere il quiz"},500);
    const byId=new Map(rows.map(q=>[q.id,q]));
    const questions=open.question_ids.map((id:string)=>byId.get(id)).filter(Boolean);
    if(questions.length!==4)return reply(req,{error:"Sessione quiz non più disponibile"},409);
    if(category!=="Tutte le materie"&&questions.some(q=>q.category!==category))return reply(req,{error:"Hai già un quiz in corso. Completa quello aperto prima di iniziarne un altro."},409);
    return reply(req,{attempt_id:open.id,questions,answers:Array.isArray(open.answers)?open.answers:[],expires_at:new Date(new Date(open.started_at).getTime()+SESSION_MS).toISOString(),resumed:true});
   }
   const {data:pool,error:poolError}=await questionPool(category);
   if(poolError||!pool)return reply(req,{error:"Errore nel caricamento delle domande"},500);
   if(pool.length<4)return reply(req,{error:"Non ci sono abbastanza domande per questa materia"},422);
   const status=await cooldownFor(user.id,category);
   if(status.error)return reply(req,{error:"Impossibile verificare il ripristino delle domande"},500);
   if(status.available<4)return reply(req,{error:"Le domande recenti sono in ripristino",cooldown_until:status.cooldown_until,available:status.available});
   const since=new Date(Date.now()-WINDOW_MS).toISOString();
   const {data:recent}=await db.from("quiz_attempts").select("question_ids").eq("user_id",user.id).not("completed_at","is",null).gte("completed_at",since);
   const used=new Set<string>();for(const a of recent||[])for(const id of a.question_ids||[])used.add(id);
   const eligible=pool.filter(q=>!used.has(q.id));
   const shuffled=[...eligible];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}const selected=shuffled.slice(0,4);
   const {data:attempt,error:attemptError}=await db.from("quiz_attempts").insert({user_id:user.id,question_ids:selected.map(q=>q.id)}).select("id,started_at").single();
   if(attemptError)return reply(req,{error:"Impossibile avviare il quiz"},500);
   return reply(req,{attempt_id:attempt.id,questions:selected,expires_at:new Date(new Date(attempt.started_at).getTime()+SESSION_MS).toISOString(),resumed:false});
  }
  if(body.action==="save"){
   const attemptId=String(body.attempt_id??""),answers=body.answers;
   if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!Array.isArray(answers)||answers.length<1||answers.length>4||answers.some((a:any)=>!Number.isInteger(a)||a<0||a>3))return reply(req,{error:"Checkpoint non valido"},400);
   const {data:attempt,error:readError}=await db.from("quiz_attempts").select("id,started_at,completed_at").eq("id",attemptId).eq("user_id",user.id).maybeSingle();
   if(readError||!attempt)return reply(req,{error:"Sessione non trovata"},404);
   if(attempt.completed_at)return reply(req,{error:"Quiz già consegnato"},409);
   if(new Date(attempt.started_at).getTime()<Date.now()-SESSION_MS)return reply(req,{error:"Sessione scaduta"},410);
   const {error:saveError}=await db.from("quiz_attempts").update({answers}).eq("id",attemptId).eq("user_id",user.id).is("completed_at",null);
   if(saveError)return reply(req,{error:"Checkpoint non salvato"},500);
   return reply(req,{saved:true,count:answers.length});
  }
  if(body.action==="submit"){
   const attemptId=String(body.attempt_id??""),answers=body.answers;
   if(!/^[0-9a-f-]{36}$/i.test(attemptId)||!Array.isArray(answers)||answers.length!==4||answers.some((a:any)=>!Number.isInteger(a)||a<0||a>3))return reply(req,{error:"Risposte non valide"},400);
   const {data,error}=await db.rpc("complete_quiz_attempt",{p_user_id:user.id,p_attempt_id:attemptId,p_answers:answers});
   if(error){const code=error.code==="23505"?409:error.code==="42501"?403:400;return reply(req,{error:error.message==="Quiz già consegnato"?"Questo quiz è già stato consegnato":error.message==="Quiz scaduto"?"Il tempo della sessione è scaduto. Avvia un nuovo quiz.":"Impossibile registrare il risultato"},code);}
   return reply(data);
  }
  return reply(req,{error:"Azione non riconosciuta"},400);
 }catch(e){console.error("quiz-engine",e);return reply(req,{error:"Errore durante il quiz"},500);}
});