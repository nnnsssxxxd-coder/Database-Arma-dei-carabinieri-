self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting());});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim());});
self.addEventListener("push",event=>{
 let data={title:"Area personale",body:"Hai un nuovo aggiornamento."};
 try{if(event.data)data={...data,...event.data.json()};}catch(_){}
 event.waitUntil(self.registration.showNotification(data.title||"Area personale",{body:data.body||"",tag:data.tag||"area-personale",data:{url:data.url||"./"}}));
});
self.addEventListener("notificationclick",event=>{
 event.notification.close();
 const target=event.notification.data&&event.notification.data.url||"./";
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
  for(const client of list){if("focus" in client)return client.focus();}
  return self.clients.openWindow?self.clients.openWindow(target):undefined;
 }));
});