import React,{useEffect,useState}from'react';
import{BookOpen,LockKeyhole,LogOut,ShieldCheck}from'lucide-react';
import{navigationText}from'./siteNavigationTranslations.js';

const API='/api/internal-guides';
const TOKEN_KEY='us4a-internal-guides-token';

async function request(path,{method='GET',body,token}={}){
  const headers={};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(token)headers.Authorization=`Bearer ${token}`;
  const response=await fetch(`${API}/${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const type=response.headers.get('content-type')??'';
  const data=type.includes('application/json')?await response.json():{};
  if(!response.ok){
    const error=new Error(data.error??'Une erreur est survenue.');
    error.code=data.code;
    throw error;
  }
  return data;
}

export default function InternalGuides({lang='fr'}){
  const t=navigationText(lang);
  const[token,setToken]=useState(()=>sessionStorage.getItem(TOKEN_KEY)??'');
  const[password,setPassword]=useState('');
  const[authenticated,setAuthenticated]=useState(false);
  const[checking,setChecking]=useState(Boolean(token));
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');

  useEffect(()=>{
    if(!token){setChecking(false);setAuthenticated(false);return}
    let active=true;
    request('session',{token}).then(()=>{if(active)setAuthenticated(true)}).catch(()=>{
      sessionStorage.removeItem(TOKEN_KEY);
      if(active){setToken('');setAuthenticated(false)}
    }).finally(()=>{if(active)setChecking(false)});
    return()=>{active=false};
  },[token]);

  async function login(event){
    event.preventDefault();setBusy(true);setError('');
    try{
      const data=await request('login',{method:'POST',body:{password}});
      sessionStorage.setItem(TOKEN_KEY,data.token);
      setPassword('');setToken(data.token);setAuthenticated(true);
    }catch(reason){
      setError(reason.code==='invalid_password'?t.invalidPassword:reason.code==='internal_guides_unavailable'?t.unavailable:reason.message);
    }finally{setBusy(false)}
  }

  function logout(){
    sessionStorage.removeItem(TOKEN_KEY);setToken('');setAuthenticated(false);setError('');
  }

  if(checking)return <section className="internal-access-card"><LockKeyhole size={42}/><p>{t.checking}</p></section>;

  if(!authenticated)return <section className="internal-access-card">
    <div className="eyebrow">{t.protectedLabel}</div>
    <LockKeyhole className="internal-access-icon" size={48}/>
    <h1>{t.protectedTitle}</h1>
    <p>{t.protectedDesc}</p>
    <form className="internal-access-form" onSubmit={login}>
      <label>{t.password}<input required type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label>
      {error?<div className="internal-access-error" role="alert">{error}</div>:null}
      <button className="hero-cta" disabled={busy}><ShieldCheck size={19}/>{busy?t.checking:t.unlock}</button>
    </form>
  </section>;

  return <section className="internal-access-card internal-access-granted">
    <ShieldCheck className="internal-access-icon" size={48}/>
    <div className="eyebrow">{t.protectedLabel}</div>
    <h1>{t.internalReadyTitle}</h1>
    <p>{t.internalReadyDesc}</p>
    <div className="internal-empty"><BookOpen size={38}/><span>{t.internalEmpty}</span></div>
    <button className="back-button" onClick={logout}><LogOut size={17}/>{t.logout}</button>
  </section>;
}
