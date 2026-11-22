const encoder=new TextEncoder();
const decoder=new TextDecoder();

class HttpError extends Error{
  constructor(status,message,code='request_error'){
    super(message);this.status=status;this.code=code;
  }
}

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

function toBase64Url(bytes){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}

function fromBase64Url(value){
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
  const padding='='.repeat((4-normalized.length%4)%4);
  const binary=atob(normalized+padding);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}

async function digest(value){
  return new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(String(value))));
}

async function hmac(secret,value){
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}

async function safeEqual(first,second){
  const[a,b]=await Promise.all([digest(first),digest(second)]);
  if(a.length!==b.length)return false;
  let difference=0;
  for(let index=0;index<a.length;index+=1)difference|=a[index]^b[index];
  return difference===0;
}

async function passwordVersion(password){
  return toBase64Url(await digest(password)).slice(0,16);
}

async function createToken(secret,password){
  const body=toBase64Url(encoder.encode(JSON.stringify({type:'alliance-area',version:await passwordVersion(password),exp:Date.now()+12*60*60*1000})));
  return `${body}.${toBase64Url(await hmac(secret,body))}`;
}

async function verifyToken(token,secret,password){
  const[body,signature,extra]=String(token??'').split('.');
  if(!body||!signature||extra)throw new HttpError(401,'Session invalide.','invalid_session');
  const expected=toBase64Url(await hmac(secret,body));
  if(!(await safeEqual(signature,expected)))throw new HttpError(401,'Session invalide.','invalid_session');
  let payload;
  try{payload=JSON.parse(decoder.decode(fromBase64Url(body)))}catch{throw new HttpError(401,'Session invalide.','invalid_session')}
  if(payload.type!=='alliance-area'||payload.version!==await passwordVersion(password)||Number(payload.exp)<Date.now())throw new HttpError(401,'Session expirée.','invalid_session');
  return payload;
}

function settings(env){
  const password=String(env.ALLIANCE_AREA_PASSWORD??env.ALLIANCE_ACCESS_CODE??'');
  const secret=String(env.SESSION_SECRET??'');
  if(!password||!secret)throw new HttpError(503,'L’accès à l’espace Alliance n’est pas encore configuré.','alliance_access_unavailable');
  return{password,secret};
}

async function requestBody(request){
  try{return await request.json()}catch{throw new HttpError(400,'Formulaire invalide.','invalid_json')}
}

function bearerToken(request){
  const header=request.headers.get('authorization')??'';
  return header.startsWith('Bearer ')?header.slice(7).trim():'';
}

async function login(request,env){
  const{password,secret}=settings(env);
  const body=await requestBody(request);
  if(!(await safeEqual(String(body.password??''),password)))throw new HttpError(401,'Mot de passe incorrect.','invalid_password');
  return json({token:await createToken(secret,password),expiresIn:12*60*60});
}

async function session(request,env){
  const{password,secret}=settings(env);
  await verifyToken(bearerToken(request),secret,password);
  return json({authenticated:true});
}

export async function onRequest({request,env}){
  const path=new URL(request.url).pathname.replace(/^\/api\/alliance-access\/?/,'').replace(/\/+$/,'');
  const method=request.method.toUpperCase();
  try{
    if(method==='OPTIONS')return new Response(null,{status:204});
    if(method==='POST'&&path==='login')return await login(request,env);
    if(method==='GET'&&path==='session')return await session(request,env);
    throw new HttpError(404,'Adresse inconnue.','not_found');
  }catch(error){
    if(error instanceof HttpError)return json({error:error.message,code:error.code},error.status);
    console.error('Alliance access error',error);
    return json({error:'Une erreur inattendue est survenue.',code:'internal_error'},500);
  }
}
