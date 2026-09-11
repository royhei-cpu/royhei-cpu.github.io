(function(){
function installGuestHost(host=window){
 const backend='https://pawlish-ryans-english-dog.lhei111.chatgpt.site';
 const storageKey='pawlish.github.visitor.v1';
 let token='',persistent=true,avatar=null;
 try{token=host.localStorage.getItem(storageKey)||'';}catch{persistent=false;}
 if(!/^[a-f0-9]{64}$/.test(token)){
  token=Array.from(host.crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
  try{host.localStorage.setItem(storageKey,token);}catch{persistent=false;}
 }
 const originalFetch=host.fetch.bind(host);
 host.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,host.location.href);
  if(url.origin!==host.location.origin||!url.pathname.startsWith('/api/'))return originalFetch(input,init);
  const source=new Request(typeof input==='string'||input instanceof URL?url:input,init);
  const target=new URL('/api/public/'+url.pathname.slice('/api/'.length)+url.search,backend);
  const headers=new Headers(source.headers);headers.set('X-Pawlish-Visitor',token);headers.delete('Authorization');
  // A Request used as RequestInit exposes its body as a ReadableStream.
  // Send the original file/string instead; upload streaming is not required.
  const options={method:source.method,headers,credentials:'omit',mode:'cors',cache:source.cache,redirect:source.redirect,signal:source.signal};
  if(source.method!=='GET'&&source.method!=='HEAD')options.body=init?.body??await source.blob();
  return originalFetch(target.href,options);
 };
 host.PawlishGuest={persistent,
  async avatar(url){
   if(avatar?.source===url)return avatar.promise;
   const entry={source:url,promise:null,url:null};const old=avatar;avatar=entry;
   entry.promise=(async()=>{
    const response=await host.fetch(url,{cache:'no-store'});if(!response.ok||!/^image\//.test(response.headers.get('Content-Type')||''))throw new Error('分身没加载好，请重试。');
    const blob=await response.blob();entry.url=host.URL.createObjectURL(blob);
    if(avatar!==entry){host.URL.revokeObjectURL(entry.url);throw new Error('正在更新小狗，请稍等。');}
    if(old?.url)host.URL.revokeObjectURL(old.url);return entry.url;
   })().catch(error=>{if(avatar===entry)avatar=null;throw error;});return entry.promise;
  },
  clearAvatar(){if(avatar?.url)host.URL.revokeObjectURL(avatar.url);avatar=null;}
 };
 host.addEventListener('pagehide',event=>{if(!event.persisted)host.PawlishGuest.clearAvatar();});
}

installGuestHost();
})();
