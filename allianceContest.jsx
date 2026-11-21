import React,{useEffect,useMemo,useState}from'react';
import{Award,BookOpen,CalendarDays,CheckCircle2,Download,Eye,FileImage,Images,KeyRound,LockKeyhole,Shield,Trash2,Trophy,Upload,Users,Vote}from'lucide-react';
import'./allianceContest.css';

const API='/api/contest';
const MAX_FILES=5;
const MAX_BYTES=3*1024*1024;

const phaseCopy={
  setup:'Activation technique en cours',
  submissions:'Participations ouvertes',
  preparing:'Préparation des créations',
  voting:'Vote ouvert',
  runoff_pending:'Second tour à venir',
  runoff:'Second tour ouvert',
  closed:'Vote terminé',
  results:'Résultats publiés'
};

function formatDate(value){
  if(!value)return'—';
  return new Intl.DateTimeFormat('fr-FR',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(value));
}

function fileSize(bytes){
  return bytes>=1024*1024?`${(bytes/1024/1024).toFixed(1)} Mo`:`${Math.ceil(bytes/1024)} Ko`;
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

async function compressImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(`${file.name} n’est pas une image acceptée.`);
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
  if(!blob||blob.size>MAX_BYTES)throw new Error(`${file.name} reste trop volumineuse après compression.`);
  return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg'});
}

function Notice({kind='info',children}){
  return <div className={`contest-notice ${kind}`}>{children}</div>;
}

function Overview({state,onView,onOpenGuides}){
  const results=state?.results;
  return <div className="contest-overview">
    <section className="contest-announcement">
      <div>
        <div className="contest-kicker">CONCOURS EXCLUSIF AUX MEMBRES US4A</div>
        <h2>Le plus beau château</h2>
        <p>Disposez vos bâtiments, statues et décorations pour créer un château unique. Partagez jusqu’à cinq captures afin de montrer l’ensemble de votre création.</p>
        <div className="contest-actions">
          <button className="contest-primary" onClick={()=>onView('submit')}><Upload size={18}/>Participer</button>
          <button className="contest-secondary" onClick={()=>onView('vote')}><Vote size={18}/>Accéder au vote</button>
        </div>
      </div>
      <div className="contest-visual" aria-hidden="true"><img src="/images/alliance/castle-contest-announcement.png" alt=""/></div>
    </section>

    <div className="contest-info-grid">
      <article><CalendarDays/><h3>Calendrier</h3><p>Dépôt jusqu’au <strong>27 novembre à 23 h 59</strong>.</p><p>Vote du <strong>28 novembre à 10 h</strong> au <strong>29 novembre à 18 h</strong>.</p></article>
      <article><Images/><h3>Participation</h3><p>De 1 à 5 captures par joueur, modifiables jusqu’à la clôture. Les images restent privées avant le vote.</p></article>
      <article><Vote/><h3>Vote équitable</h3><p>Chaque membre classe trois créations : 3, 2 et 1 point. Aucun participant ne peut voter pour son propre château.</p></article>
    </div>

    <section className="contest-prizes">
      <div><Trophy/><span>1re place</span><strong>30 coffres de ville</strong></div>
      <div><Award/><span>2e place</span><strong>20 coffres de ville</strong></div>
      <div><Award/><span>3e place</span><strong>10 coffres de ville</strong></div>
    </section>

    <section className="contest-steps">
      <h2>Comment participer ?</h2>
      <ol>
        <li><span>1</span><div><strong>Préparez votre château</strong><p>Créez une décoration originale, harmonieuse et créative.</p></div></li>
        <li><span>2</span><div><strong>Déposez vos captures</strong><p>Saisissez votre nom exact et le code Alliance, puis envoyez jusqu’à cinq images.</p></div></li>
        <li><span>3</span><div><strong>Conservez votre code personnel</strong><p>Il permet de remplacer vos images jusqu’au 27 novembre à 23 h 59.</p></div></li>
        <li><span>4</span><div><strong>Votez pour vos favoris</strong><p>Votre code de vote individuel garantit un seul bulletin par membre.</p></div></li>
      </ol>
    </section>

    {results?<Results results={results}/>:null}

    <button className="contest-guide-link" onClick={onOpenGuides}><BookOpen size={22}/><span><strong>Besoin de préparer vos ressources ?</strong><small>Retrouvez les guides du Duel d’alliance.</small></span></button>
  </div>;
}

function Results({results}){
  const podium=[['1',results.podium?.first],['2',results.podium?.second],['3',results.podium?.third]];
  return <section className="contest-results-public">
    <div className="contest-kicker">RÉSULTATS OFFICIELS</div><h2>Le podium US4A</h2>
    <div className="contest-podium">{podium.map(([place,entry])=>entry?<article key={place} className={`place-${place}`}><span>{place}</span><img src={entry.imageUrl} alt={`Création de ${entry.memberName}`}/><h3>{entry.memberName}</h3><p>{entry.label}</p></article>:null)}</div>
  </section>;
}

function SubmissionPanel(){
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
      setError(reason.message);
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
    }catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function uploadFiles(event){
    const files=[...event.target.files];event.target.value='';
    if(!files.length)return;
    if((submission?.images.length??0)+files.length>MAX_FILES){setError('Le total ne peut pas dépasser cinq images.');return}
    setBusy(true);setError('');setMessage('Compression et envoi en cours…');
    try{
      for(const original of files){
        const file=await compressImage(original);
        const form=new FormData();form.append('file',file);
        await api('/submission/image',{method:'POST',token,form});
      }
      setMessage(`${files.length} image${files.length>1?'s':''} enregistrée${files.length>1?'s':''}.`);await load();
    }catch(reason){setError(reason.message);setMessage('')}finally{setBusy(false)}
  }

  async function removeImage(id){
    if(!confirm('Retirer cette image de votre participation ?'))return;
    setBusy(true);setError('');
    try{await api(`/submission/image/${encodeURIComponent(id)}`,{method:'DELETE',token});await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  function disconnect(){localStorage.removeItem('us4a-contest-submission-token');setToken('');setSubmission(null);setNewCode('');setMessage('')}

  if(!token||!submission)return <section className="contest-panel contest-auth-panel">
    <div className="contest-panel-heading"><Upload/><div><div className="contest-kicker">PARTICIPATION</div><h2>Déposer mes captures</h2></div></div>
    <div className="contest-mode-switch"><button className={mode==='new'?'active':''} onClick={()=>setMode('new')}>Nouvelle participation</button><button className={mode==='returning'?'active':''} onClick={()=>setMode('returning')}>Modifier mes images</button></div>
    <form onSubmit={authenticate} className="contest-form">
      <label>Nom exact dans le jeu<input required value={name} onChange={event=>setName(event.target.value)} autoComplete="nickname"/></label>
      {mode==='new'?<label>Code de l’alliance<input required type="password" value={accessCode} onChange={event=>setAccessCode(event.target.value)} autoComplete="one-time-code"/></label>:<label>Code personnel de modification<input required value={editCode} onChange={event=>setEditCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" autoComplete="one-time-code"/></label>}
      {error?<Notice kind="error">{error}</Notice>:null}
      <button className="contest-primary" disabled={busy}>{busy?'Vérification…':mode==='new'?'Commencer mon dépôt':'Retrouver ma participation'}</button>
    </form>
  </section>;

  return <section className="contest-panel">
    <div className="contest-panel-heading"><Images/><div><div className="contest-kicker">PARTICIPATION DE {submission.memberName}</div><h2>Mes captures du château</h2></div><button className="contest-text-button" onClick={disconnect}>Quitter</button></div>
    {newCode?<Notice kind="success"><div className="contest-code-notice"><strong>Conservez ce code personnel : <code>{newCode}</code></strong><span>Il ne sera affiché qu’une fois et permet de modifier vos images jusqu’à la date limite.</span></div></Notice>:null}
    <p>Ajoutez de 1 à 5 images. Elles restent privées et ne sont visibles que par l’organisateur.</p>
    <div className="submission-images">
      {submission.images.map((image,index)=><article key={image.id}><img src={image.url} alt={`Capture ${index+1}`}/><div><span>Capture {index+1}</span><small>{fileSize(image.size_bytes)}</small></div>{!submission.locked?<button aria-label="Retirer cette image" onClick={()=>removeImage(image.id)}><Trash2 size={17}/></button>:null}</article>)}
      {!submission.locked&&submission.images.length<MAX_FILES?<label className="submission-add"><Upload/><strong>Ajouter des images</strong><span>{MAX_FILES-submission.images.length} emplacement{MAX_FILES-submission.images.length>1?'s':''} disponible{MAX_FILES-submission.images.length>1?'s':''}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={uploadFiles} disabled={busy}/></label>:null}
    </div>
    {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}
    {submission.images.length?<Notice><CheckCircle2 size={18}/>Votre participation est enregistrée. Vous pouvez revenir la modifier avant la clôture.</Notice>:null}
  </section>;
}

function VotePanel(){
  const[token,setToken]=useState(()=>sessionStorage.getItem('us4a-contest-voter-token')??'');
  const[name,setName]=useState('');
  const[code,setCode]=useState('');
  const[gallery,setGallery]=useState(null);
  const[picks,setPicks]=useState({first:'',second:'',third:''});
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');

  async function load(activeToken=token){
    if(!activeToken)return;
    try{
      const data=await api('/vote/gallery',{token:activeToken});setGallery(data);setPicks(data.ballot??{first:'',second:'',third:''});setError('');
    }catch(reason){setError(reason.message);if(['invalid_session','expired_session','unauthorized'].includes(reason.code)){sessionStorage.removeItem('us4a-contest-voter-token');setToken('')}}
  }
  useEffect(()=>{load()},[]);

  async function login(event){
    event.preventDefault();setBusy(true);setError('');
    try{const data=await api('/vote/login',{method:'POST',body:{name,code}});sessionStorage.setItem('us4a-contest-voter-token',data.token);setToken(data.token);await load(data.token)}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function saveVote(event){
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try{await api('/vote',{method:'POST',token,body:picks});setMessage('Votre bulletin est enregistré. Vous pouvez le modifier jusqu’à la fermeture du vote.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  if(!token||!gallery)return <section className="contest-panel contest-auth-panel"><div className="contest-panel-heading"><Vote/><div><div className="contest-kicker">VOTE DES MEMBRES</div><h2>Accéder au bulletin</h2></div></div><p>Utilisez le code personnel transmis par l’organisateur. Chaque membre ne dispose que d’un seul bulletin.</p><form className="contest-form" onSubmit={login}><label>Nom exact dans le jeu<input required value={name} onChange={event=>setName(event.target.value)}/></label><label>Code personnel de vote<input required value={code} onChange={event=>setCode(event.target.value.toUpperCase())} placeholder="XXXXX-XXXXX"/></label>{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?'Vérification…':'Ouvrir mon bulletin'}</button></form></section>;

  const selectable=gallery.entries.filter(entry=>entry.canVote);
  const isRunoff=gallery.round===2;
  return <section className="contest-panel"><div className="contest-panel-heading"><Vote/><div><div className="contest-kicker">{isRunoff?'SECOND TOUR':'VOTE PRINCIPAL'}</div><h2>{isRunoff?'Départagez les créations ex æquo':'Classez vos trois créations préférées'}</h2></div></div>
    <div className="vote-gallery">{gallery.entries.map(entry=><article key={entry.id} className={!entry.canVote?'own-entry':''}><img src={entry.imageUrl} alt={entry.label}/><h3>{entry.label}</h3>{!entry.canVote?<span>Votre création — vote impossible</span>:null}</article>)}</div>
    {selectable.length?(<form className="contest-ballot" onSubmit={saveVote}>
      <label><strong>{isRunoff?'Votre choix':'1er choix — 3 points'}</strong><select required value={picks.first} onChange={event=>setPicks({...picks,first:event.target.value})}><option value="">Sélectionner…</option>{selectable.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></label>
      {!isRunoff?<><label><strong>2e choix — 2 points</strong><select required value={picks.second} onChange={event=>setPicks({...picks,second:event.target.value})}><option value="">Sélectionner…</option>{selectable.map(entry=><option key={entry.id} value={entry.id} disabled={entry.id===picks.first}>{entry.label}</option>)}</select></label><label><strong>3e choix — 1 point</strong><select required value={picks.third} onChange={event=>setPicks({...picks,third:event.target.value})}><option value="">Sélectionner…</option>{selectable.map(entry=><option key={entry.id} value={entry.id} disabled={[picks.first,picks.second].includes(entry.id)}>{entry.label}</option>)}</select></label></>:null}
      {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer mon vote'}</button>
    </form>):<Notice>Le bulletin n’est pas encore disponible.</Notice>}
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

  async function load(activeToken=token){
    if(!activeToken)return;
    try{
      const[entriesData,membersData]=await Promise.all([api('/admin/entries',{token:activeToken}),api('/admin/members',{token:activeToken})]);
      setData(entriesData);setMembers(membersData.members);
      setLabels(Object.fromEntries(entriesData.entries.map(entry=>[entry.id,entry.display_label??''])));
      setRunoff(entriesData.settings?.runoffEntries??[]);
      setPodium(entriesData.settings?.podium??{first:'',second:'',third:''});setError('');
    }catch(reason){setError(reason.message);if(['invalid_session','expired_session','unauthorized'].includes(reason.code)){sessionStorage.removeItem('us4a-contest-admin-token');setToken('')}}
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

  async function uploadFinal(submissionId,file){
    if(!file)return;setBusy(true);setError('');
    try{const form=new FormData();form.append('submissionId',submissionId);form.append('file',file);await api('/admin/final',{method:'POST',token,form});setMessage('Montage final enregistré.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function publishEntry(entry,published){
    setBusy(true);setError('');
    try{await api('/admin/publish-entry',{method:'POST',token,body:{submissionId:entry.id,label:labels[entry.id],published}});setMessage(published?'Création ajoutée au vote.':'Création retirée du vote.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function saveRunoff(){
    if(runoff.length<2){setError('Sélectionnez au moins deux créations ex æquo.');return}
    setBusy(true);setError('');
    try{await api('/admin/settings',{method:'POST',token,body:{settings:{runoffEntries:runoff}}});setMessage('Second tour préparé.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  async function publishPodium(){
    if(!confirm('Publier définitivement le podium et rendre les créations visibles au public ?'))return;
    setBusy(true);setError('');
    try{await api('/admin/podium',{method:'POST',token,body:podium});setMessage('Le podium est maintenant public.');await load()}catch(reason){setError(reason.message)}finally{setBusy(false)}
  }

  if(!token||!data)return <section className="contest-panel contest-auth-panel"><div className="contest-panel-heading"><LockKeyhole/><div><div className="contest-kicker">ESPACE ORGANISATEUR</div><h2>Administration privée</h2></div></div><form className="contest-form" onSubmit={login}><label>Mot de passe administrateur<input required type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label>{error?<Notice kind="error">{error}</Notice>:null}<button className="contest-primary" disabled={busy}>{busy?'Connexion…':'Se connecter'}</button></form></section>;

  const published=data.entries.filter(entry=>entry.published&&entry.final_image_key);
  const scoreMap=new Map((data.results?.firstRound??[]).map(score=>[score.submission_id,Number(score.points)]));
  const runoffMap=new Map((data.results?.secondRound??[]).map(score=>[score.submission_id,Number(score.votes)]));
  return <section className="contest-admin">
    <div className="contest-panel-heading"><Shield/><div><div className="contest-kicker">ESPACE ORGANISATEUR</div><h2>Gestion du concours</h2></div><button className="contest-text-button" onClick={()=>{sessionStorage.removeItem('us4a-contest-admin-token');setToken('');setData(null)}}>Quitter</button></div>
    <div className="admin-summary"><div><Users/><strong>{members.length}</strong><span>membres autorisés</span></div><div><Images/><strong>{data.entries.length}</strong><span>participations</span></div><div><Vote/><strong>{data.results?.ballots?.find(item=>item.round===1)?.ballots??0}</strong><span>bulletins reçus</span></div></div>
    <div className="admin-actions"><button className="contest-secondary" onClick={downloadCodes} disabled={busy}><Download size={18}/>Télécharger les codes de vote</button></div>
    {message?<Notice kind="success">{message}</Notice>:null}{error?<Notice kind="error">{error}</Notice>:null}

    {!members.length?<section className="admin-block"><h3>Importer les membres</h3><p>Une ligne par joueur au format <code>Nom;R3</code>. Cette liste reste dans la base privée.</p><textarea rows="10" value={importText} onChange={event=>setImportText(event.target.value)} placeholder="Leischo;R5&#10;Nero2;R4"/><button className="contest-primary" onClick={importMembers} disabled={busy}>Importer la liste</button></section>:null}

    <section className="admin-block"><h3>Participations et montages</h3>{data.entries.length?<div className="admin-entries">{data.entries.map(entry=><article key={entry.id}>
      <header><div><strong>{entry.member_name}</strong><span>{entry.member_rank} · {entry.images.length} image{entry.images.length>1?'s':''}</span></div><span className={entry.published?'published':'private'}>{entry.published?'Dans le vote':'Privée'}</span></header>
      <div className="admin-raw-images">{entry.images.map((image,index)=><a key={image.id} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={`Capture ${index+1} de ${entry.member_name}`}/><span><Eye size={14}/>Image {index+1}</span></a>)}</div>
      <div className="admin-final-row">{entry.finalImageUrl?<img src={entry.finalImageUrl} alt={`Montage final de ${entry.member_name}`}/>:<div className="admin-final-empty"><FileImage/>Aucun montage final</div>}<label className="contest-secondary"><Upload size={17}/>{entry.finalImageUrl?'Remplacer le montage':'Ajouter le montage'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>uploadFinal(entry.id,event.target.files[0])}/></label></div>
      <div className="admin-publish-row"><label>Nom anonyme<input value={labels[entry.id]??''} onChange={event=>setLabels({...labels,[entry.id]:event.target.value})} placeholder="Château A"/></label><button className={entry.published?'contest-danger':'contest-primary'} onClick={()=>publishEntry(entry,!entry.published)} disabled={busy}>{entry.published?'Retirer du vote':'Ajouter au vote'}</button></div>
    </article>)}</div>:<Notice>Aucune participation pour le moment.</Notice>}</section>

    <section className="admin-block"><h3>Résultats du vote principal</h3><div className="admin-score-list">{published.sort((a,b)=>(scoreMap.get(b.id)??0)-(scoreMap.get(a.id)??0)).map(entry=><label key={entry.id}><input type="checkbox" checked={runoff.includes(entry.id)} onChange={event=>setRunoff(event.target.checked?[...runoff,entry.id]:runoff.filter(id=>id!==entry.id))}/><span><strong>{entry.display_label}</strong><small>{entry.member_name}</small></span><b>{scoreMap.get(entry.id)??0} pts{runoffMap.has(entry.id)?` · ${runoffMap.get(entry.id)} vote(s) au second tour`:''}</b></label>)}</div>{published.length?<button className="contest-secondary" onClick={saveRunoff} disabled={busy}>Préparer le second tour avec la sélection</button>:null}</section>

    <section className="admin-block"><h3>Publier le podium</h3><div className="admin-podium-form">{[['first','1re place'],['second','2e place'],['third','3e place']].map(([key,label])=><label key={key}>{label}<select value={podium[key]??''} onChange={event=>setPodium({...podium,[key]:event.target.value})}><option value="">Sélectionner…</option>{published.map(entry=><option key={entry.id} value={entry.id}>{entry.display_label} — {entry.member_name}</option>)}</select></label>)}</div><button className="contest-primary" onClick={publishPodium} disabled={busy||published.length<3}><Trophy size={18}/>Publier les résultats</button></section>
  </section>;
}

export default function AllianceContest({onOpenGuides}){
  const[view,setView]=useState('overview');
  const[state,setState]=useState(null);
  const[error,setError]=useState('');
  useEffect(()=>{api('/public').then(setState).catch(reason=>setError(reason.message))},[]);
  const phase=state?.phase??'setup';
  const tabs=useMemo(()=>[
    ['overview',Trophy,'Le concours'],
    ['submit',Upload,'Participer'],
    ['vote',Vote,'Voter'],
    ['admin',LockKeyhole,'Organisateur']
  ],[]);
  return <section className="alliance-contest">
    <div className="alliance-contest-header"><div className="contest-kicker">US4A — ALLIANCE</div><h1>Concours du plus beau château</h1><p>Créativité, harmonie et plaisir de construire ensemble.</p><span className={`contest-phase phase-${phase}`}>{phaseCopy[phase]??phase}</span></div>
    <nav className="contest-tabs" aria-label="Rubriques du concours">{tabs.map(([id,Icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id)}><Icon size={18}/>{label}</button>)}</nav>
    {error?<Notice kind="error">{error}</Notice>:null}
    {view==='overview'?<Overview state={state} onView={setView} onOpenGuides={onOpenGuides}/>:view==='submit'?<SubmissionPanel/>:view==='vote'?<VotePanel/>:<AdminPanel/>}
    <footer className="contest-footer-note"><LockKeyhole size={15}/>Les captures originales sont privées. Seuls les montages validés par l’organisateur apparaissent pendant le vote.</footer>
  </section>;
}
