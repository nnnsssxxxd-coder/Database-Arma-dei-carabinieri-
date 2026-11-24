import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(["https://nnnsssxxxd-coder.github.io","https://localhost","capacitor://localhost","http://localhost","http://localhost:8100","https://localhost:8100"]);
function headers(req:Request){const o=req.headers.get("Origin")??"";return {"Access-Control-Allow-Origin":origins.has(o)?o:"null","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json","Cache-Control":"no-store"};}
function out(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:headers(req)});}
Deno.serve(async(req:Request)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:headers(req)});if(req.method!=="POST")return out(req,{error:"Metodo non consentito"},405);try{
 const b=await req.json(),username=String(b.username??"").trim().toLowerCase(),password=String(b.password??"");
 if(!/^[a-z0-9_-]{3,24}$/.test(username)||password.length<1||password.length>128)return out(req,{error:"Credenziali non valide."},400);
 const {data:a,error:ae}=await admin.from("ministry_admins").select("user_id,auth_email,display_name,active,must_change_password,username").eq("username",username).maybeSingle();
 if(ae||!a||!a.active)return out(req,{error:"Credenziali non valide o account non attivo."},401);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.signInWithPassword({email:a.auth_email,password});
 if(error||!data.session||data.user?.id!==a.user_id)return out(req,{error:"Credenziali non corrette."},401);
 return out(req,{session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token},ministry:{username:a.username,display_name:a.display_name,must_change_password:a.must_change_password}});
}catch(e){console.error("ministry-login",e);return out(req,{error:"Accesso Ministero temporaneamente non disponibile."},500);}});
