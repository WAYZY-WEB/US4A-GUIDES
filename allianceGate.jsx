import React,{useEffect,useState}from'react';
import{LockKeyhole,LogOut,ShieldCheck}from'lucide-react';
import{navigationText}from'./siteNavigationTranslations.js';

const API='/api/alliance-access';
const TOKEN_KEY='us4a-alliance-area-token';

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

export default function AllianceGate({lang='fr',children}){
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
      setError(reason.code==='invalid_password'?t.invalidPassword:reason.code==='alliance_access_unavailable'?t.allianceUnavailable:reason.message);
    }finally{setBusy(false)}
  }

  function logout(){
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('us4a-internal-guides-token');
    setToken('');setAuthenticated(false);setError('');
  }

  if(checking)return <section className="internal-access-card"><LockKeyhole size={42}/><p>{t.checking}</p></section>;

  if(!authenticated)return <section className="internal-access-card alliance-access-card">
    <div className="eyebrow">{t.allianceAccessLabel}</div>
    <LockKeyhole className="internal-access-icon" size={48}/>
    <h1>{t.allianceAccessTitle}</h1>
    <p>{t.allianceAccessDesc}</p>
    <form className="internal-access-form" onSubmit={login}>
      <label>{t.password}<input required type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label>
      {error?<div className="internal-access-error" role="alert">{error}</div>:null}
      <button className="hero-cta" disabled={busy}><ShieldCheck size={19}/>{busy?t.checking:t.allianceUnlock}</button>
    </form>
  </section>;

  return <div className="alliance-private-area">
    <div className="alliance-session-bar"><span><ShieldCheck size={17}/>{t.allianceSession}</span><button onClick={logout}><LogOut size={16}/>{t.allianceLogout}</button></div>
    {children}
  </div>;
}
