import React,{useEffect,useMemo,useState}from'react';
import{Award,BookOpen,CalendarDays,CheckCircle2,Download,Eye,FileImage,Images,KeyRound,LockKeyhole,Shield,Trash2,Trophy,Upload,Users,Vote}from'lucide-react';
import'./allianceContest.css';
import{contestText,interpolate}from'./allianceContestTranslations.js';

const API='/api/contest';
const MAX_FILES=5;
const MAX_BYTES=3*1024*1024;

function fileSize(bytes,t){
  return bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} ${t.sizeMb}`:`${Math.ceil(bytes/1024)} ${t.sizeKb}`;
}

function localizedError(reason,t){
  const code=reason?.code==='expired_session'?'invalid_session':reason?.code;
  return t.errors?.[code]??reason?.message??t.errors.generic;
}

async function api(path,{method='GET',body,token,form}={}){
  const headers={};
  if(token)headers.Authorization=`Bearer ${token}`;
  if(body!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(`${API}${path}`,{method,headers,body:form??(body!==undefined?JSON.stringify(body):undefined)});
  const contentType=response.headers.get('content-type')??'';
  const data=contentType.includes('application/json')?await response.json():await response.blob();
  if(!response.ok){
    const error=new Error(data?.error??'Une erreur est survenue.');
    error.code=data?.code;
    throw error;
  }
  return data;
}

async function compressImage(file,t){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(interpolate(t.invalidLocalImage,{name:file.name}));
  if(file.size<=MAX_BYTES)return file;
  const bitmap=await createImageBitmap(file);
  const maximum=2560;
  const ratio=Math.min(1,maximum/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio));
  canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d',{alpha:false});
  context.fillStyle='#07101f';
  context.fillRect(0,0,canvas.width,canvas.height);
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  bitmap.close?.();
  let quality=.9;
  let blob;
  do{
    blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
    quality-=.08;
  }while(blob&&blob.size>MAX_BYTES&&quality>=.5);
  if(!blob||blob.size>MAX_BYTES)throw new Error(interpolate(t.compressionFailed,{name:file.name}));
  return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
}

function Notice({kind='info',children}){
  return <div className={`contest-notice ${kind}`}>{children}</div>;
}

function Overview({state,onView,onOpenGuides,t}){
  const results=state?.results;
  return <div className="contest-overview">
    <section className="contest-announcement">
      <div>
        <div className="contest-kicker">{t.exclusive}</div>
        <h2>{t.contestTitle}</h2>
        <p>{t.contestDescription}</p>
        <div className="contest-actions">
          <button className="contest-primary" onClick={()=>onView('submit')}><Upload size={18}/>{t.participate}</button>
          <button className="contest-secondary" onClick={()=>onView('vote')}><Vote size={18}/>{t.openVote}</button>
        </div>
      </div>
      <div className="contest-visual" aria-hidden="true"><img src="/images/alliance/castle-contest-announcement.png" alt=""/></div>
    </section>

    <div className="contest-info-grid">
      <article><CalendarDays/><h3>{t.calendar}</h3><p>{t.depositDeadline}</p><p>{t.votePeriod}</p><p><strong>{t.serverTimeNote}</strong></p></article>
      <article><Images/><h3>{t.participation}</h3><p>{t.participationDescription}</p></article>
      <article><Vote/><h3>{t.fairVote}</h3><p>{t.fairVoteDescription}</p></article>
    </div>

    <section className="contest-prizes">
      <div><Trophy/><span>{t.firstPlace}</span><strong>{t.firstPrize}</strong></div>
      <div><Award/><span>{t.secondPlace}</span><strong>{t.secondPrize}</strong></div>
      <div><Award/><span>{t.thirdPlace}</span><strong>{t.thirdPrize}</strong></div>
    </section>

    <section className="contest-steps">
      <h2>{t.howTo}</h2>
      <ol>
        <li><span>1</span><div><strong>{t.step1Title}</strong><p>{t.step1Body}</p></div></li>
        <li><span>2</span><div><strong>{t.step2Title}</strong><p>{t.step2Body}</p></div></li>
        <li><span>3</span><div><strong>{t.step3Title}</strong><p>{t.step3Body}</p></div></li>
        <li><span>4</span><div><strong>{t.step4Title}</strong><p>{t.step4Body}</p></div></li>
      </ol>
    </section>

    {results?<Results results={results} t={t}/>:null}

    <button className="contest-guide-link" onClick={onOpenGuides}><BookOpen size={22}/><span><strong>{t.guideTitle}</strong><small>{t.guideBody}</small></span></button>
  </div>;
}

function Results({results,t}){
  const podium=[['1',results.podium?.first],['2',results.podium?.second],['3',results.podium?.third]];
  return <section className="contest-results-public">
    <div className="contest-kicker">{t.officialResults}</div><h2>{t.podiumTitle}</h2>
    <div className="contest-podium">{podium.map(([place,entry])=>entry?<article key={place} className={`place-${place}${entry.imageUrl?'':' podium-no-image'}`}><span>{place}</span>{entry.imageUrl?<img src={entry.imageUrl} alt={interpolate(t.creationAlt,{name:entry.memberName})}/>:null}<h3>{entry.memberName}</h3><p>{entry.label}</p></article>:null)}</div>
  </section>;
}

function SubmissionPanel({t}){
  const[token,setToken]=useState(()=>localStorage.getItem('us4a-contest-submission-token')??'');
  const[submission,setSubmission]=useState(null);
  const[mode,setMode]=useState('new');
  const[name,setName]=useState('');
  const[accessCode,setAccessCode]=useState('');
  const[editCode,setEditCode]=useState('');
  const[newCode,setNewCode]=useState('');
  const[busy,setBusy]=useState(false);
  const[message,setMessage]=useState('');
  const[error,setError]=useState('');

  async function load(activeToken=token){
    if(!activeToken)return;
    try{
      const data=await api('/submission',{token:activeToken});
      setSubmission(data.submission);setError('');
    }catch(reason){
      setError(localizedError(reason,t));
      if(['invalid_session','expired_session','unauthorized'].includes(reason.code)){localStorage.removeItem('us4a-contest-submission-token');setToken('');}
    }
  }
  useEffect(()=>{load()},[]);

  async function authenticate(event){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{
      const data=mode==='new'
        ?await api('/submission/start',{method:'POST',body:{name,accessCode}})
        :await api('/submission/login',{method:'POST',body:{name,editCode}});
      localStorage.setItem('us4a-contest-submission-token',data.token);setToken(data.token);
      if(data.editCode)setNewCode(data.editCode);
      await load(data.token);
    }catch(reason){setError(localizedError(reason,t))}finally{setBusy(false)}
  }

  async function uploadFiles(event){
    const files=[...event.target.files];event.target.value='';
    if(!files.length)return;
    if((submission?.images.length??0)+files.length>MAX_FILES){setError(t.maxFive);return}
    setBusy(true);setError('');setMessage(t.compressing);
    try{
      for(const original of files){
        const file=await compressImage(original,t);
        const form=new FormData();form.append('file',file);
        await api('/submission/image',{method:'POST',token,form});
      }
      setMessage(interpolate(t.filesSaved,{count:files.length}));await load();
    }catch(reason){setError(localizedError(reason,t));setMessage('')}finally{setBusy(false)}
  }

  async function removeImage(id){
    if(!confirm(t.removeImageConfirm))return;
    setBusy(true);setError('');
    try{await api(`/submission/image/${encodeURIComponent(id)}`,{method:'DELETE',token});await load()}catch(reason){setError(localizedError(reason,t))}finally{setBusy(false)}
  }

  function disconnect(){localStorage.removeItem('us4a-contest-submission-token');setToken('');setSubmission(null);setNewCode('');setMessage('')}

  if(!token||!submission)return <section className="contest-panel contest-auth-panel">
    <div className="contest-panel-heading"><Upload/><div><div className="contest-kicker">{t.submissionKicker}</div><h2>{t.depositTitle}</h2></div></div>
    <div className="contest-mode-switch"><button className={mode==='new'?'active':''} onClick={()=>setMode('new')}>{t.newEntry}</button><button className={mode==='returning'?'active':''} onClick={()=>setMode('returning')}>{t.editImages}</button></div>
    <form onSubmit={authenticate} className="contest-form">
      <label>{t.exactName}<input required value={name} onChange={event=>setName(event.target.value)} autoComplete="nickname"/></label>
      {mode==='new'?<label>{t.allianceCode}<input required type="password" value={accessCode} onChange={event=>setAccessCode(event.target.value)} autoComplete="one-time-code"/></label>:<label>{t.editCode}<input required dir="ltr" value={editCode} onChange={event=>setEditCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code"/></label>}
      {error?<Notice kind="error">{error}</Notice>:null}
      <button className="contest-primary" disabled={busy}>{busy?t.verifying:mode==='new'?t.startDeposit:t.findEntry}</button>
    </form>
  </section>;

  return <section className="contest-panel">
    <div className="contest-panel-heading"><Images/><div><div className="contest-kicker">{interpolate(t.participationOf,{name:submission.memberName})}</div><h2>{t.myCaptures}</h2></div><button className="contest-text-button" onClick={disconnect}>{t.quit}</button></div>
    {newCode?<Notice kind="success"><div className="contest-code-notice"><strong>{interpolate(t.keepCode,{code:''})}<code dir="ltr">{newCode}</code></strong><span>{t.codeOnce}</span></div></Notice>:null}
    <p>{t.addIntro}</p>
    <div className="submission-images">
      {submission.images.map((image,index)=><article key={image.id}><img src={image.url} alt={interpolate(t.capture,{number:index+1})}/><div><span>{interpolate(t.capture,{number:index+1})}</span><small>{fileSize(image.size_bytes,t)}</small></div>{!submission.locked?<button aria-label={t.removeImageAria} onClick={()=>removeImage(image.id)}><Trash2 size={17}/></button>:null}</article>)}
      {!submission.locked&&submission.images.length<MAX_FILES?<label className="submission-add"><Upload/><strong>{t.addImages}</strong><span>{interpolate(t.slotsAvailable,{count:MAX_FILES-submission.images.length})}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadFiles} disabled={busy}/></label>:null}
    </div>
    {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}
    {submission.images.length?<Notice><CheckCircle2 size={18}/>{t.entrySaved}</Notice>:null}
  </section>;
}

function VoteCastleCard({entry,t}){
  const[active,setActive]=useState(0);
  const images=entry.imageUrls??[entry.imageUrl];
  const current=Math.min(active,images.length-1);
  return <article className={!entry.canVote?'own-entry':''}>
    <img className={entry.imageUrl?'':'vote-capture'} src={images[current]} loading="lazy" referrerPolicy="no-referrer"
      alt={entry.imageUrl?entry.label:`${entry.label} · ${interpolate(t.capture,{number:current+1})}`}/>
    {images.length>1?<div className="vote-capture-controls">{images.map((url,index)=><button
      key={url} type="button" aria-label={interpolate(t.capture,{number:index+1})} aria-pressed={index===current}
      onClick={()=>setActive(index)}>{index+1}</button>)}</div>:null}
    <h3>{entry.label}</h3>
    {!entry.canVote?<span>{t.ownEntry}</span>:null}
  </article>;
}

function VotePanel({t,phase}){
  const[token,setToken]=useState(()=>sessionStorage.getItem('us4a-contest-voter-token')??'');
  const[name,setName]=useState('');
  const[code,setCode]=useState('');
  const[gallery,setGallery]=useState(null);
  const[picks,setPicks]=useState({first:'',second:'',third:''});
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const galleryAvailable=['voting','runoff','runoff_pending','closed','results'].includes(phase);

  async function load(activeToken=token){
    if(!activeToken)return;
    try{
      const data=await api('/vote/gallery',{token:activeToken});setGallery(data);setPicks(data.ballot??{first:'',second:'',third:''});setError('');
    }catch(reason){setError(localizedError(reason,t));if(['invalid_session','expired_session','unauthorized'].includes(reason.code)){sessionStorage.removeItem('us4a-contest-voter-token');setToken('')}}
  }
  useEffect(()=>{load()},[]);

  async function login(event){
    event.preventDefault();setBusy(true);setError('');
    try{const data=await api('/vote/login',{method:'POST',body:{name,code}});sessionStorage.setItem('us4a-contest-voter-token',data.token);setToken(data.token);await load(data.token)}catch(reason){setError(localizedError(reason,t))}finally{setBusy(false)}
  }

  async function saveVote(event){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{await api('/vote',{method:'POST',token,body:picks});setMessage(t.voteSaved);await load()}catch(reason){setError(localizedError(reason,t))}finally{setBusy(false)}
  }

  if((!token||!gallery)&&!galleryAvailable)return <section className="contest-panel contest-auth-panel"><div className="contest-panel-heading"><Vote/><div><div className="contest-kicker">{t.memberVote}</div><h2>{t.accessBallot}</h2></div></div><Notice><CalendarDays size={18}/><span>{t.errors.gallery_closed}<br/>{t.votePeriod}<br/><strong>{t.serverTimeNote}</strong></span></Notice></section>;

  if(!token||!gallery)return <section className="contest-panel contest-auth-panel"><div className="contest-panel-heading"><Vote/><div><div className="contest-kicker">{t.memberVote}</div><h2>{t.accessBallot}</h2></div></div><p>{t.voteAccessDesc}</p><form className="contest-form" onSubmit={login}><label>{t.exactName}<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>{t.personalVoteCode}<input required dir="ltr" value={code} onChange={event=>setCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX"/></label>{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?t.verifying:t.openBallot}</button></form></section>;

  const selectable=gallery.entries.filter(entry=>entry.canVote);
  const isRunoff=gallery.round===2;
  return <section className="contest-panel"><div className="contest-panel-heading"><Vote/><div><div className="contest-kicker">{isRunoff?t.runoffRound:t.mainRound}</div><h2>{isRunoff?t.runoffTitle:t.rankTitle}</h2></div></div>
    <div className="vote-gallery">{gallery.entries.map(entry=><VoteCastleCard key={entry.id} entry={entry} t={t}/>)}</div>
    {selectable.length?(<form className="contest-ballot" onSubmit={saveVote}>
      <label><strong>{isRunoff?t.yourChoice:t.firstChoice}</strong><select required value={picks.first} onChange={event=>setPicks({...picks,first:event.target.value})}><option value="">{t.select}</option>{selectable.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
      {!isRunoff?<><label><strong>{t.secondChoice}</strong><select required value={picks.second} onChange={event=>setPicks({...picks,second:event.target.value})}><option value="">{t.select}</option>{selectable.map(entry=><option key={entry.id} value={entry.id} disabled={entry.id===picks.first}>{entry.label}</option>)}</select></label><label><strong>{t.thirdChoice}</strong><select required value={picks.third} onChange={event=>setPicks({...picks,third:event.target.value})}><option value="">{t.select}</option>{selectable.map(entry=><option key={entry.id} value={entry.id} disabled={[picks.first,picks.second].includes(entry.id)}>{entry.label}</option>)}</select></label></>:null}
      {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?t.saving:t.saveVote}</button>
    </form>):<Notice>{t.ballotUnavailable}</Notice>}
  </section>;
}

function AdminPanel(){
  const[token,setToken]=useState(()=>sessionStorage.getItem('us4a-contest-admin-token')??'');
  const[password,setPassword]=useState('');
  const[data,setData]=useState(null);
  const[members,setMembers]=useState([]);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const[labels,setLabels]=useState({});
  const[runoff,setRunoff]=useState([]);
  const[podium,setPodium]=useState({first:'',second:'',third:''});
  const[importText,setImportText]=useState('');
  const[visibleEditCode,setVisibleEditCode]=useState(null);

  async function load(activeToken=token){
    if(!activeToken)return;
    try{
      const[entriesData,membersData]=await Promise.all([api('/admin/entries',{token:activeToken}),api('/admin/members',{token:activeToken})]);
      setData(entriesData);setMembers(membersData.members);
      setLabels(Object.fromEntries(entriesData.entries.map(entry=>[entry.id,entry.display_label??''])));
      setRunoff(entriesData.settings?.runoffEntries??[]);
      setPodium(entriesData.settings?.podium??{first:'',second:'',third:''});setError('');
    }catch(reason){setError(reason.message);if(['invalid_session','expired_session','unauthorized'].includes(reason.code)){sessionStorage.removeItem('us4a-contest-admin-token');setToken('');setVisibleEditCode(null)}}
  }
  useEffect(()=>{load()},[]);

  async function login(event){
    event.preventDefault();setBusy(true);setError('');
    try{const result=await api('/admin/login',{method:'POST',body:{password}});sessionStorage.setItem('us4a-contest-admin-token',result.token);setToken(result.token);setPassword('');await load(result.token)}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function importMembers(){
    const parsed=importText.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const match=line.match(/^(.*?)[;,-]\s*(R[1-5])$/i);return match?{name:match[1].trim(),rank:match[2].toUpperCase()}:null});
    if(parsed.some(item=>!item)){setError('Utilisez une ligne par joueur au format : Nom;R3');return}
    setBusy(true);setError('');
    try{await api('/admin/members/import',{method:'POST',token,body:{members:parsed}});setMessage(`${parsed.length} membres importés.`);setImportText('');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function downloadCodes(){
    setBusy(true);setError('');
    try{const blob=await api('/admin/vote-codes',{token});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='codes-vote-us4a.csv';link.click();URL.revokeObjectURL(url)}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function showEditCode(entry,regenerate){
    if(regenerate&&!confirm(`Générer un nouveau code de modification pour ${entry.member_name} ? L’ancien code et les sessions de dépôt ouvertes seront invalidés.`))return;
    setVisibleEditCode(null);setBusy(true);setError('');setMessage('');
    try{
      const result=await api(`/admin/entries/${encodeURIComponent(entry.id)}/edit-code`,{token,method:regenerate?'POST':'GET'});
      if(sessionStorage.getItem('us4a-contest-admin-token')!==token)return;
      setVisibleEditCode({entryId:entry.id,code:result.editCode});
      if(regenerate)setData(previous=>({...previous,entries:previous.entries.map(item=>item.id===entry.id?{...item,edit_code_available:1}:item)}));
    }catch(reason){
      if(sessionStorage.getItem('us4a-contest-admin-token')!==token)return;
      if(reason.code==='edit_code_unavailable')setData(previous=>({...previous,entries:previous.entries.map(item=>item.id===entry.id?{...item,edit_code_available:0}:item)}));
      setError(reason.message);
    }finally{setBusy(false)}
  }

  async function copyEditCode(){
    try{
      await navigator.clipboard.writeText(visibleEditCode.code);
      setMessage('Code de modification copié.');setError('');
    }catch{
      setError('Sélectionnez le code affiché pour le copier manuellement.');
    }
  }

  async function uploadFinal(submissionId,file){
    if(!file)return;setBusy(true);setError('');
    try{const form=new FormData();form.append('submissionId',submissionId);form.append('file',file);await api('/admin/final',{method:'POST',token,form});setMessage('Montage final enregistré.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function publishEntry(entry,published,source){
    setBusy(true);setError('');setMessage('');
    const body={submissionId:entry.id,label:labels[entry.id],published,source};
    if(source==='captures')body.imageIds=entry.images.map(image=>image.id);
    try{
      await api('/admin/publish-entry',{method:'POST',token,body});
      setMessage(!published?'Création retirée du vote.':source==='captures'?'Captures d’origine validées pour le vote.':'Montage ajouté au vote.');
      await load();
    }catch(reason){
      if(reason.code==='captures_changed')await load();
      setError(reason.code==='captures_changed'?'Les captures ont changé. Vérifiez les nouvelles images, puis validez à nouveau.':reason.message);
    }finally{setBusy(false)}
  }

  async function saveRunoff(){
    if(runoff.length<2){setError('Sélectionnez au moins deux créations ex æquo.');return}
    setBusy(true);setError('');
    try{await api('/admin/settings',{method:'POST',token,body:{settings:{runoffEntries:runoff}}});setMessage('Second tour préparé.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function publishPodium(){
    if(!confirm('Publier les noms et le classement du podium ? Les montages seront visibles au public. Les captures d’origine resteront réservées aux votants.'))return;
    setBusy(true);setError('');
    try{await api('/admin/podium',{method:'POST',token,body:podium});setMessage('Le podium est maintenant public.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  if(!token||!data)return <section className="contest-panel contest-auth-panel" dir="ltr"><div className="contest-panel-heading"><LockKeyhole/><div><div className="contest-kicker">ESPACE ORGANISATEUR</div><h2>Administration privée</h2></div></div><form className="contest-form" onSubmit={login}><label>Mot de passe administrateur<input required type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label>{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?'Connexion…':'Se connecter'}</button></form></section>;

  const published=data.entries.filter(entry=>entry.vote_eligible);
  const canRegenerateCode=Date.now()<=Date.parse(data.settings?.submissionDeadline);
  const scoreMap=new Map((data.results?.firstRound??[]).map(score=>[score.submission_id,Number(score.points)]));
  const runoffMap=new Map((data.results?.secondRound??[]).map(score=>[score.submission_id,Number(score.votes)]));
  return <section className="contest-admin" dir="ltr">
    <div className="contest-panel-heading"><Shield/><div><div className="contest-kicker">ESPACE ORGANISATEUR</div><h2>Gestion du concours</h2></div><button className="contest-text-button" onClick={()=>{sessionStorage.removeItem('us4a-contest-admin-token');setToken('');setData(null);setVisibleEditCode(null)}}>Quitter</button></div>
    <div className="admin-summary"><div><Users/><strong>{members.length}</strong><span>membres autorisés</span></div><div><Images/><strong>{data.entries.length}</strong><span>participations</span></div><div><Vote/><strong>{data.results?.ballots?.find(item=>item.round===1)?.ballots??0}</strong><span>bulletins reçus</span></div></div>
    <div className="admin-actions"><button className="contest-secondary" onClick={downloadCodes} disabled={busy}><Download size={18}/>Télécharger les codes de vote</button></div>
    {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}

    {!members.length?<section className="admin-block"><h3>Importer les membres</h3><p>Une ligne par joueur au format <code>Nom;R3</code>. Cette liste reste dans la base privée.</p><textarea rows="10" value={importText} onChange={event=>setImportText(event.target.value)} placeholder="Leischo;R5&#10;Nero2;R4"/><button className="contest-primary" onClick={importMembers} disabled={busy}>Importer la liste</button></section>:null}

    <section className="admin-block"><h3>Participations et montages</h3>{data.entries.length?<div className="admin-entries">{data.entries.map(entry=><article key={entry.id}>
      <header><div><strong>{entry.member_name}</strong><span>{entry.member_rank} · {entry.images.length} image{entry.images.length>1?'s':''}</span></div><span className={entry.vote_eligible?'published':'private'}>{entry.vote_eligible?(entry.uses_captures?'Dans le vote · Captures':'Dans le vote · Montage'):(entry.published?'Captures à revalider':'Privée')}</span></header>
      <div className="admin-edit-code">
        {visibleEditCode?.entryId===entry.id?<>
          <span>Code de modification <code dir="ltr">{visibleEditCode.code}</code></span>
          <button type="button" className="contest-secondary" onClick={copyEditCode}>Copier le code</button>
          <button type="button" className="contest-text-button" onClick={()=>setVisibleEditCode(null)}>Masquer</button>
        </>:entry.edit_code_available?(
          <button type="button" className="contest-secondary" disabled={busy} onClick={()=>showEditCode(entry,false)}><KeyRound size={17}/>Afficher le code de modification</button>
        ):canRegenerateCode?(
          <button type="button" className="contest-secondary" disabled={busy} onClick={()=>showEditCode(entry,true)}><KeyRound size={17}/>Générer un nouveau code de modification</button>
        ):null}
      </div>
      <div className="admin-raw-images">{entry.images.map((image,index)=><a key={image.id} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Capture ${index+1} de ${entry.member_name}`}/><span><Eye size={14}/>Image {index+1}</span></a>)}</div>
      <div className="admin-final-row">{entry.finalImageUrl?<img src={entry.finalImageUrl} alt={`Montage final de ${entry.member_name}`}/>:<div className="admin-final-empty"><FileImage/>Aucun montage final</div>}<label className="contest-secondary"><Upload size={17}/>{entry.finalImageUrl?'Remplacer le montage':'Ajouter le montage'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>uploadFinal(entry.id,event.target.files[0])}/></label></div>
      <div className="admin-publish-row">
        <label>Nom anonyme<input value={labels[entry.id]??''} onChange={event=>setLabels({...labels,[entry.id]:event.target.value})} placeholder="Château A"/></label>
        <div className="admin-publish-actions">
          {entry.images.length>0&&(!entry.published||entry.uses_captures)?<button className="contest-primary"
            onClick={()=>publishEntry(entry,true,'captures')} disabled={busy}>{entry.published?'Actualiser les captures':'Utiliser les captures déposées'}</button>:null}
          {!entry.published&&entry.finalImageUrl?<button className="contest-secondary"
            onClick={()=>publishEntry(entry,true,'montage')} disabled={busy}>Ajouter le montage au vote</button>:null}
          {entry.published?<button className="contest-danger" onClick={()=>publishEntry(entry,false)} disabled={busy}>Retirer du vote</button>:null}
        </div>
      </div>
    </article>)}</div>:<Notice>Aucune participation pour le moment.</Notice>}</section>

    <section className="admin-block"><h3>Résultats du vote principal</h3><div className="admin-score-list">{published.sort((a,b)=>(scoreMap.get(b.id)??0)-(scoreMap.get(a.id)??0)).map(entry=><label key={entry.id}><input type="checkbox" checked={runoff.includes(entry.id)} onChange={event=>setRunoff(event.target.checked?[...runoff,entry.id]:runoff.filter(id=>id!==entry.id))}/><span><strong>{entry.display_label}</strong><small>{entry.member_name}</small></span><b>{scoreMap.get(entry.id)??0} pts{runoffMap.has(entry.id)?` · ${runoffMap.get(entry.id)} vote(s) au second tour`:''}</b></label>)}</div>{published.length?<button className="contest-secondary" onClick={saveRunoff} disabled={busy}>Préparer le second tour avec la sélection</button>:null}</section>

    <section className="admin-block"><h3>Publier le podium</h3><div className="admin-podium-form">{[['first','1re place'],['second','2e place'],['third','3e place']].map(([key,label])=><label key={key}>{label}<select value={podium[key]??''} onChange={event=>setPodium({...podium,[key]:event.target.value})}><option value="">Sélectionner…</option>{published.map(entry=><option key={entry.id} value={entry.id}>{entry.display_label} — {entry.member_name}</option>)}</select></label>)}</div><button className="contest-primary" onClick={publishPodium} disabled={busy||published.length<3}><Trophy size={18}/>Publier les résultats</button></section>
  </section>;
}

export default function AllianceContest({onOpenGuides,lang='fr',initialView='overview',onViewChange}){
  const[view,setView]=useState(initialView);
  const[state,setState]=useState(null);
  const[error,setError]=useState('');
  const t=contestText(lang);
  useEffect(()=>setView(initialView),[initialView]);
  useEffect(()=>{api('/public').then(setState).catch(reason=>setError(localizedError(reason,t)))},[]);
  const phase=state?.phase??'setup';
  const tabs=useMemo(()=>[
    ['overview',Trophy,t.tabOverview],
    ['submit',Upload,t.tabSubmit],
    ['vote',Vote,t.tabVote],
    ['admin',LockKeyhole,'Organisateur']
  ],[t]);
  function changeView(nextView){
    setView(nextView);
    onViewChange?.(nextView);
  }
  return <section className="alliance-contest">
    <div className="alliance-contest-header"><div className="contest-kicker">{t.headerKicker}</div><h1>{t.headerTitle}</h1><p>{t.headerSubtitle}</p><span className={`contest-phase phase-${phase}`}>{t.phase[phase]??phase}</span></div>
    <nav className="contest-tabs" aria-label={t.tabsAria}>{tabs.map(([id,Icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>changeView(id)}><Icon size={18}/>{label}</button>)}</nav>
    {error?<Notice kind="error">{error}</Notice>:null}
    {view==='overview'?<Overview state={state} onView={changeView} onOpenGuides={onOpenGuides} t={t}/>:view==='submit'?<SubmissionPanel t={t}/>:view==='vote'?<VotePanel t={t} phase={phase}/>:<AdminPanel/>}
    <footer className="contest-footer-note"><LockKeyhole size={15}/>{t.privacy}</footer>
  </section>;
}
