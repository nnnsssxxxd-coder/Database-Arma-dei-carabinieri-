(() => {
const canvas=document.getElementById("renderCanvas"), engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,adaptToDeviceRatio:true});
const scene=new BABYLON.Scene(engine);scene.clearColor=new BABYLON.Color4(.55,.69,.78,1);
const camera=new BABYLON.FollowCamera("camera",new BABYLON.Vector3(0,5,-10),scene);camera.radius=9;camera.heightOffset=3.2;camera.rotationOffset=180;camera.cameraAcceleration=.06;camera.maxCameraSpeed=12;camera.attachControl(canvas,true);
const hemi=new BABYLON.HemisphericLight("sky",new BABYLON.Vector3(0,1,0),scene);hemi.intensity=.82;
const sun=new BABYLON.DirectionalLight("sun",new BABYLON.Vector3(-.5,-1,.35),scene);sun.position=new BABYLON.Vector3(30,50,-30);sun.intensity=1.05;
const mat=(name,color,rough=.85)=>{let m=new BABYLON.PBRMaterial(name,scene);m.albedoColor=BABYLON.Color3.FromHexString(color);m.roughness=rough;return m};
const asphalt=mat("asfalto","#343b40"),concrete=mat("cemento","#a7a6a0"),wall=mat("intonaco","#c8bba5"),dark=mat("vetri","#263b48",.25),roof=mat("tetto","#625b54"),uniform=mat("uniforme","#182c43"),skin=mat("pelle","#bd8c6b"),white=mat("bianco","#e8e9e6"),blue=mat("blu","#132c4c"),red=mat("rosso","#d92832"),green=mat("verde","#46664e");
const box=(n,x,y,z,w,h,d,m)=>{let o=BABYLON.MeshBuilder.CreateBox(n,{width:w,height:h,depth:d},scene);o.position.set(x,y,z);o.material=m;return o};
const ground=BABYLON.MeshBuilder.CreateGround("ground",{width:260,height:260},scene);ground.material=green;
box("road",0,.025,0,18,.05,220,asphalt);box("crossroad",0,.03,0,220,.06,18,asphalt);
for(let z=-100;z<=100;z+=8){box("line",0,.06,z, .18,.02,3.5,white)}
for(let x=-100;x<=100;x+=8){box("line",x,.065,0,3.5,.02,.18,white)}
// City blocks: sidewalks, buildings, windows, balconies and rooftop details
for(let bx=-3;bx<=3;bx++)for(let bz=-5;bz<=5;bz++){if(Math.abs(bx)<=1&&Math.abs(bz)<=1)continue;let x=bx*28+(bx<0?-7:7),z=bz*27+(bz<0?-6:6);box("marciapiede",x,.12,z,20,.22,19,concrete);let h=10+((Math.abs(bx*13+bz*7)%4)*3),w=12+((bx+bz+12)%3)*2;box("palazzo",x,h/2+.2,z,w,h,13,wall);box("tetto",x,h+.25,z,w+.3,.5,13.3,roof);for(let yy=3;yy<h-1;yy+=3)for(let xx=-w/2+2;xx<w/2-1;xx+=3){box("finestra",x+xx,yy,z-6.56,1.35,1.7,.08,dark)}}
const stationX=0,stationZ=-20;
box("caserma",stationX,3.5,stationZ,20,7,12,wall);box("caserma-tetto",0,7.1,-20,20.5,.5,12.5,roof);box("ingresso",0,1.5,-13.92,3.2,3,.18,blue);box("targa",0,5,-13.85,8,1.2,.18,blue);
const sign=BABYLON.MeshBuilder.CreatePlane("scritta",{width:7.4,height:.85},scene);sign.position.set(0,5,-13.7);let dt=new BABYLON.DynamicTexture("targa",{width:1024,height:256},scene);dt.drawText("CARABINIERI",null,175,"bold 112px Arial","white","#132c4c",true);let sm=new BABYLON.StandardMaterial("signmat",scene);sm.diffuseTexture=dt;sign.material=sm;
// Character with simple articulated silhouette, ready for replacement by a rigged GLB
const player=new BABYLON.TransformNode("operatore",scene);let torso=BABYLON.MeshBuilder.CreateCapsule("corpo",{height:1.45,radius:.34},scene);torso.parent=player;torso.position.y=1.05;torso.material=uniform;
let head=BABYLON.MeshBuilder.CreateSphere("testa",{diameter:.48,segments:16},scene);head.parent=player;head.position.y=2;head.material=skin;
let cap=box("berretto",0,0,0,.48,.16,.48,blue);cap.parent=player;cap.position.y=2.25;
for(let side of [-1,1]){let leg=BABYLON.MeshBuilder.CreateCapsule("gamba",{height:.9,radius:.16},scene);leg.parent=player;leg.position.set(side*.19,.35,0);leg.material=blue;let arm=BABYLON.MeshBuilder.CreateCapsule("braccio",{height:.85,radius:.13},scene);arm.parent=player;arm.position.set(side*.43,1.1,0);arm.rotation.z=side*-.18;arm.material=uniform}
player.position.set(0,0,0);camera.lockedTarget=player;
const car=new BABYLON.TransformNode("gazzella",scene);car.position.set(4,0,-5);
let body=box("carrozzeria",0,.75,0,2.15,.65,4.4,blue);body.parent=car;let cabin=box("abitacolo",0,1.35,-.2,1.7,.75,2.2,dark);cabin.parent=car;
for(let sx of [-1,1])for(let sz of [-1,1]){let wh=BABYLON.MeshBuilder.CreateCylinder("ruota",{diameter:.7,height:.22,tessellation:16},scene);wh.parent=car;wh.position.set(sx*1.08,.42,sz*1.45);wh.rotation.z=Math.PI/2;wh.material=asphalt}
let roofbar=box("barra-luci",0,1.78,-.2,.9,.12,.35,white);roofbar.parent=car;
let redLight=box("luce-rossa",-.25,1.88,-.2,.35,.13,.3,red);redLight.parent=car;let blueLight=box("luce-blu",.25,1.88,-.2,.35,.13,.3,blue);blueLight.parent=car;
car.setEnabled(false);
let driving=false,siren=false,flash=false,steer=0,throttle=0,speed=0,heading=0;
const setMode=()=>document.getElementById("mode").textContent=(driving?"ALLA GUIDA":"A PIEDI")+" • "+(siren?"EMERGENZA ATTIVA":"SERVIZIO NON INIZIATO");
document.getElementById("enter").onclick=()=>{driving=!driving;if(driving){car.position.copyFrom(player.position);car.rotation.y=player.rotation.y;player.setEnabled(false);car.setEnabled(true);camera.lockedTarget=car;document.getElementById("enter").textContent="SCENDI"}else{player.position.copyFrom(car.position);player.position.x+=2.2;player.setEnabled(true);car.setEnabled(false);camera.lockedTarget=player;speed=0;document.getElementById("enter").textContent="AUTO"}setMode()};
document.getElementById("siren").onclick=()=>{siren=!siren;document.getElementById("siren").textContent=siren?"SIRENA ON":"SIRENA OFF";setMode()};
document.getElementById("lights").onclick=()=>{flash=!flash;document.getElementById("lights").textContent=flash?"LAMPEGGIANTI ON":"LAMPEGGIANTI"};
const pad=document.getElementById("pad"),nub=document.getElementById("nub");let active=false;
function pointer(e){let r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),len=Math.hypot(dx,dy),max=42;if(len>max){dx=dx/len*max;dy=dy/len*max}nub.style.transform="translate("+dx+"px,"+dy+"px)";steer=dx/max;throttle=-dy/max}
pad.addEventListener("pointerdown",e=>{active=true;pad.setPointerCapture(e.pointerId);pointer(e)});pad.addEventListener("pointermove",e=>{if(active)pointer(e)});function release(){active=false;steer=0;throttle=0;nub.style.transform="translate(0,0)"}pad.addEventListener("pointerup",release);pad.addEventListener("pointercancel",release);
const keys={};addEventListener("keydown",e=>keys[e.key.toLowerCase()]=true);addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);
let t=0;
// RP progression and multiplayer client connection.
let onDuty=false, money=2500, rankName="Civile", netRoom=null, netClient=null, netReady=false, lastNetSend=0;
const remotePlayers=new Map();
const statusEl=document.getElementById("mpstatus");
const addChat=(line)=>{const log=document.getElementById("chatlog");const row=document.createElement("div");row.textContent=line;log.appendChild(row);log.scrollTop=log.scrollHeight};
document.getElementById("duty").onclick=()=>{if(document.getElementById("playerrole").value!=="Carabiniere"){statusEl.textContent="Seleziona il ruolo Carabiniere per iniziare il servizio.";return}onDuty=!onDuty;document.getElementById("duty").textContent=onDuty?"TERMINA SERVIZIO":"INIZIA SERVIZIO";rankName="Carabiniere";if(netRoom)netRoom.send("duty",{active:onDuty});document.getElementById("objective").textContent=onDuty?"Servizio attivo: raggiungi una zona di pattuglia.":"Esplora la città e raggiungi la caserma.";setMode()};
document.getElementById("interact").onclick=()=>{const target=driving?car.position:player.position;const d=Math.hypot(target.x,target.z+20);if(d<14){document.getElementById("objective").textContent="Sei alla caserma: servizio, briefing e rimessa.";addChat("Sistema: sei entrato nell'area della caserma.")}else if(Math.hypot(target.x-4,target.z+5)<5&&!driving){document.getElementById("objective").textContent="Veicolo di servizio disponibile: premi AUTO.";addChat("Sistema: avvicinati alla pattuglia.")}else{document.getElementById("objective").textContent="Nessuna interazione disponibile qui. Esplora la città.";addChat("Sistema: nessun punto interattivo nelle vicinanze.")}};
document.getElementById("chatbtn").onclick=()=>{if(!netRoom){addChat("Chat disponibile quando il server multiplayer sarà collegato.");return}const message=prompt("Scrivi un messaggio in chat");if(message)netRoom.send("chat",{message})};
document.getElementById("connect").onclick=async()=>{
 const url=document.getElementById("serverurl").value.trim();
 if(!url){statusEl.textContent="Il server online deve essere pubblicato e il suo indirizzo inserito qui.";return}
 if(!window.Colyseus||!window.Colyseus.Client){statusEl.textContent="SDK multiplayer non caricato. Riprova con connessione internet.";return}
 try{
  netClient=new window.Colyseus.Client(url);
  netRoom=await netClient.joinOrCreate("italian_city");
  netReady=true;statusEl.textContent="Connesso alla città • "+netRoom.sessionId.slice(0,6);
  netRoom.send("profile",{name:document.getElementById("playername").value,role:document.getElementById("playerrole").value});
  netRoom.onMessage("chat",m=>addChat((m.name||"Giocatore")+": "+m.message));
  netRoom.onMessage("system",m=>addChat(m.message));
  netRoom.state.players.onAdd((p,id)=>{if(id===netRoom.sessionId)return;const mesh=BABYLON.MeshBuilder.CreateCapsule("remote-"+id,{height:2,radius:.35},scene);mesh.material=uniform;remotePlayers.set(id,{mesh,p});p.onChange(()=>{mesh.position.set(p.x,1,p.z);mesh.rotation.y=p.rotation})});
  netRoom.state.players.onRemove((p,id)=>{const item=remotePlayers.get(id);if(item)item.mesh.dispose();remotePlayers.delete(id)});
  addChat("Connesso alla sessione RP.");
 }catch(e){netReady=false;statusEl.textContent="Connessione non riuscita: verifica indirizzo e server.";console.error(e)}
};

engine.runRenderLoop(()=>{let dt=Math.min(engine.getDeltaTime()/1000,.04);t+=dt;let forward=throttle||((keys.w||keys.arrowup)?1:0)-((keys.s||keys.arrowdown)?1:0),turn=steer||((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0);
if(driving){speed+=(forward*13-speed*1.8)*dt;speed=Math.max(-5,Math.min(22,speed));car.rotation.y+=turn*dt*(.8+Math.abs(speed)*.035);car.position.x+=Math.sin(car.rotation.y)*speed*dt;car.position.z+=Math.cos(car.rotation.y)*speed*dt;redLight.isVisible=flash&&Math.sin(t*12)>0;blueLight.isVisible=flash&&!redLight.isVisible}else{let move=forward||((keys.w||keys.arrowup)?1:0)-((keys.s||keys.arrowdown)?1:0);let turn2=turn||((keys.d||keys.arrowright)?1:0)-((keys.a||keys.arrowleft)?1:0);if(Math.abs(move)>.04){player.rotation.y+=turn2*dt*2.2;player.position.x+=Math.sin(player.rotation.y)*move*dt*4.2;player.position.z+=Math.cos(player.rotation.y)*move*dt*4.2}}if(netRoom&&t-lastNetSend>.12){const p=driving?car.position:player.position;netRoom.send("move",{x:p.x,z:p.z,rotation:driving?car.rotation.y:player.rotation.y,vehicle:driving});lastNetSend=t}document.getElementById("clock").textContent="08:"+String(Math.floor(t*3)%60).padStart(2,"0");scene.render()});
addEventListener("resize",()=>engine.resize());
})();