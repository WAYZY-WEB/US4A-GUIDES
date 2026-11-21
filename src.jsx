import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{ArrowLeft,BookOpen,CalendarDays,Castle,Home,Languages,Menu,Search,Shield,Swords,Trophy,X,ZoomIn}from'lucide-react';
import{gearDetails,guideLibrary,libraryUi}from'./guides.js';
import AllianceContest from'./allianceContest.jsx';
import'./style.css';

const strings={
  fr:{language:'Langue',menu:'Ouvrir le menu',subtitle:'Guides et stratégies communautaires',home:'Accueil',hub:'Centre de stratégie communautaire',welcome:'Le Panthéon des Dieux',intro:'Guides, héros, événements et outils pour maîtriser Top Lords.',guides:'Guides',heroes:'Héros & PvP',tools:'Outils',events:'Événements',contest:'Concours',alliance:'Alliance',allianceDuel:'Duel d’alliance',routines:'Routines quotidiennes & hebdomadaires',heroesSquads:'Héros & escouades',gear:'Équipement',troopsTraining:'Troupes & entraînement',buildings:'Bâtiments',bossesEvents:'Boss & événements',combatRallies:'Combats & ralliements',private:'Espace privé de l’alliance',privateDesc:'L’accès sécurisé par code sera activé en phase 2. Aucun contenu privé n’est exposé dans cette version.',soon:'Bientôt disponible',search:'Rechercher une rubrique…',read:'Explorer',viewGuide:'Voir le guide français',closeGuide:'Fermer le guide',noResults:'Aucune rubrique ne correspond à votre recherche.',notice:'Site communautaire US4A — Les captures du concours restent privées jusqu’au vote.'},
  en:{language:'Language',menu:'Open menu',subtitle:'Community guides and strategies',home:'Home',hub:'Community strategy hub',welcome:'The Pantheon of Gods',intro:'Guides, heroes, events and tools to master Top Lords.',guides:'Guides',heroes:'Heroes & PvP',tools:'Tools',events:'Events',contest:'Contest',alliance:'Alliance',allianceDuel:'Alliance Duel',routines:'Daily & Weekly Routines',heroesSquads:'Heroes & Squads',gear:'Gear',troopsTraining:'Troops & Training',buildings:'Buildings',bossesEvents:'Bosses & Events',combatRallies:'Combat & Rallies',private:'Private alliance area',privateDesc:'Secure code access will be enabled in phase 2. No private content is exposed in this version.',soon:'Coming soon',search:'Search a section…',read:'Explore',noResults:'No section matches your search.',notice:'US4A community site — Contest screenshots remain private until voting.'},
  es:{language:'Idioma',menu:'Abrir menú',subtitle:'Guías y estrategias de la comunidad',home:'Inicio',hub:'Centro de estrategia comunitaria',welcome:'El Panteón de los Dioses',intro:'Guías, héroes, eventos y herramientas para dominar Top Lords.',guides:'Guías',heroes:'Héroes y PvP',tools:'Herramientas',events:'Eventos',contest:'Concurso',alliance:'Alianza',allianceDuel:'Duelo de alianzas',routines:'Rutinas diarias y semanales',heroesSquads:'Héroes y escuadrones',gear:'Equipo',troopsTraining:'Tropas y entrenamiento',buildings:'Edificios',bossesEvents:'Jefes y eventos',combatRallies:'Combate y reuniones',private:'Área privada de la alianza',privateDesc:'El acceso seguro por código se activará en la fase 2. Esta versión no expone contenido privado.',soon:'Próximamente',search:'Buscar una sección…',read:'Explorar',noResults:'Ninguna sección coincide con tu búsqueda.',notice:'Sitio comunitario US4A — Las capturas del concurso permanecen privadas hasta la votación.'},
  de:{language:'Sprache',menu:'Menü öffnen',subtitle:'Community-Guides und Strategien',home:'Start',hub:'Community-Strategiezentrum',welcome:'Das Pantheon der Götter',intro:'Guides, Helden, Events und Werkzeuge für Top Lords.',guides:'Guides',heroes:'Helden & PvP',tools:'Werkzeuge',events:'Events',contest:'Wettbewerb',alliance:'Allianz',allianceDuel:'Allianzduell',routines:'Tägliche & wöchentliche Aufgaben',heroesSquads:'Helden & Trupps',gear:'Ausrüstung',troopsTraining:'Truppen & Training',buildings:'Gebäude',bossesEvents:'Bosse & Events',combatRallies:'Kampf & Sammelangriffe',private:'Privater Allianzbereich',privateDesc:'Der sichere Codezugang wird in Phase 2 aktiviert. Diese Version zeigt keine privaten Inhalte.',soon:'Demnächst verfügbar',search:'Bereich suchen…',read:'Entdecken',noResults:'Kein Bereich entspricht deiner Suche.',notice:'US4A-Community-Seite — Wettbewerbsbilder bleiben bis zur Abstimmung privat.'},
  ru:{language:'Язык',menu:'Открыть меню',subtitle:'Гайды и стратегии сообщества',home:'Главная',hub:'Центр стратегии сообщества',welcome:'Пантеон Богов',intro:'Гайды, герои, события и инструменты для Top Lords.',guides:'Гайды',heroes:'Герои и PvP',tools:'Инструменты',events:'События',contest:'Конкурс',alliance:'Альянс',allianceDuel:'Дуэль альянсов',routines:'Ежедневные и еженедельные задачи',heroesSquads:'Герои и отряды',gear:'Снаряжение',troopsTraining:'Войска и тренировка',buildings:'Здания',bossesEvents:'Боссы и события',combatRallies:'Бои и сборы',private:'Закрытый раздел альянса',privateDesc:'Доступ по коду появится на втором этапе. Закрытые данные сейчас не опубликованы.',soon:'Скоро',search:'Найти раздел…',read:'Открыть',noResults:'По вашему запросу ничего не найдено.',notice:'Сайт сообщества US4A — Снимки конкурса остаются закрытыми до голосования.'},
  tr:{language:'Dil',menu:'Menüyü aç',subtitle:'Topluluk rehberleri ve stratejileri',home:'Ana sayfa',hub:'Topluluk strateji merkezi',welcome:'Tanrıların Panteonu',intro:'Top Lords için rehberler, kahramanlar, etkinlikler ve araçlar.',guides:'Rehberler',heroes:'Kahramanlar ve PvP',tools:'Araçlar',events:'Etkinlikler',contest:'Yarışma',alliance:'İttifak',allianceDuel:'İttifak düellosu',routines:'Günlük ve haftalık görevler',heroesSquads:'Kahramanlar ve takımlar',gear:'Ekipman',troopsTraining:'Birlikler ve eğitim',buildings:'Binalar',bossesEvents:'Bosslar ve etkinlikler',combatRallies:'Savaş ve ralliler',private:'Özel ittifak alanı',privateDesc:'Güvenli kod erişimi ikinci aşamada açılacak. Özel içerik bu sürümde yayınlanmaz.',soon:'Yakında',search:'Bölüm ara…',read:'Keşfet',noResults:'Aramanızla eşleşen bölüm yok.',notice:'US4A topluluk sitesi — Yarışma görselleri oylamaya kadar gizli kalır.'},
  ko:{language:'언어',menu:'메뉴 열기',subtitle:'커뮤니티 가이드와 전략',home:'홈',hub:'커뮤니티 전략 허브',welcome:'신들의 판테온',intro:'Top Lords를 위한 가이드, 영웅, 이벤트와 도구.',guides:'가이드',heroes:'영웅 & PvP',tools:'도구',events:'이벤트',contest:'콘테스트',alliance:'연맹',allianceDuel:'연맹 결투',routines:'일일 및 주간 루틴',heroesSquads:'영웅과 부대',gear:'장비',troopsTraining:'병력과 훈련',buildings:'건물',bossesEvents:'보스와 이벤트',combatRallies:'전투와 집결',private:'연맹 전용 공간',privateDesc:'보안 코드 접속은 2단계에서 활성화됩니다. 이 버전에는 비공개 콘텐츠가 없습니다.',soon:'곧 공개됩니다',search:'섹션 검색…',read:'살펴보기',noResults:'검색과 일치하는 섹션이 없습니다.',notice:'US4A 커뮤니티 사이트 — 대회 이미지는 투표 전까지 비공개로 유지됩니다.'},
  ar:{language:'اللغة',menu:'فتح القائمة',subtitle:'أدلة واستراتيجيات المجتمع',home:'الرئيسية',hub:'مركز استراتيجيات المجتمع',welcome:'مجمع الآلهة',intro:'أدلة وأبطال وفعاليات وأدوات لإتقان Top Lords.',guides:'الأدلة',heroes:'الأبطال وPvP',tools:'الأدوات',events:'الفعاليات',contest:'المسابقة',alliance:'التحالف',allianceDuel:'مبارزة التحالف',routines:'المهام اليومية والأسبوعية',heroesSquads:'الأبطال والفرق',gear:'المعدات',troopsTraining:'القوات والتدريب',buildings:'المباني',bossesEvents:'الزعماء والفعاليات',combatRallies:'القتال والتجمعات',private:'منطقة التحالف الخاصة',privateDesc:'سيتم تفعيل الدخول الآمن بالرمز في المرحلة الثانية. لا يظهر أي محتوى خاص في هذه النسخة.',soon:'قريبًا',search:'ابحث عن قسم…',read:'استكشف',noResults:'لا يوجد قسم يطابق بحثك.',notice:'موقع مجتمع US4A — تبقى صور المسابقة خاصة حتى التصويت.'}
};

const languageNames={fr:'FR',en:'EN',es:'ES',de:'DE',ru:'RU',tr:'TR',ko:'KO',ar:'AR'};
const guideActions={
  fr:{view:'Voir le guide',close:'Fermer le guide'},
  en:{view:'View guide',close:'Close guide'},
  es:{view:'Ver la guía',close:'Cerrar la guía'},
  de:{view:'Guide ansehen',close:'Guide schließen'},
  ru:{view:'Открыть гайд',close:'Закрыть гайд'},
  tr:{view:'Rehberi görüntüle',close:'Rehberi kapat'},
  ko:{view:'가이드 보기',close:'가이드 닫기'},
  ar:{view:'عرض الدليل',close:'إغلاق الدليل'}
};

const validPages=new Set(['home','guides','alliance','alliance-duel','routines','heroes-squads','gear','troops-training','buildings','bosses-events','combat-rallies']);
const initialPage=()=>{
  const requested=new URLSearchParams(window.location.search).get('page');
  return validPages.has(requested)?requested:'home';
};

function App(){
  const[lang,setLang]=useState('fr');
  const[page,setPage]=useState(initialPage);
  const[query,setQuery]=useState('');
  const[mobile,setMobile]=useState(false);
  const[selectedGuide,setSelectedGuide]=useState(null);
  const t=strings[lang];
  const categories=[
    ['alliance-duel',Swords,t.allianceDuel,'/images/categories/alliance-duel.jpg'],
    ['routines',CalendarDays,t.routines,'/images/categories/daily-weekly-routines.jpg'],
    ['heroes-squads',Shield,t.heroesSquads,'/images/categories/heroes-squads.jpg'],
    ['gear',Castle,t.gear,'/images/categories/gear.jpg'],
    ['troops-training',Swords,t.troopsTraining,'/images/categories/troops-training.jpg'],
    ['buildings',Castle,t.buildings,'/images/categories/buildings.jpg'],
    ['bosses-events',Trophy,t.bossesEvents,'/images/categories/bosses-events.jpg'],
    ['combat-rallies',Swords,t.combatRallies,'/images/categories/combat-rallies.jpg']
  ];
  const navigation=[['home',Home,t.home],['guides',BookOpen,t.guides],['alliance',Shield,t.alliance]];
  const matches=categories.filter(([, ,label])=>label.toLocaleLowerCase(lang).includes(query.trim().toLocaleLowerCase(lang)));
  const totalGuides=Object.values(guideLibrary).reduce((total,guides)=>total+guides.length,0);

  useEffect(()=>{
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  },[lang]);

  useEffect(()=>{
    if(!selectedGuide)return undefined;
    const closeOnEscape=event=>{if(event.key==='Escape')setSelectedGuide(null)};
    document.body.classList.add('modal-open');
    window.addEventListener('keydown',closeOnEscape);
    return()=>{
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown',closeOnEscape);
    };
  },[selectedGuide]);

  function go(nextPage){
    setPage(nextPage);
    setMobile(false);
    setSelectedGuide(null);
    const url=new URL(window.location.href);
    if(nextPage==='home')url.searchParams.delete('page');else url.searchParams.set('page',nextPage);
    window.history.replaceState({},'',url);
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }

  const categoryPage=categories.find(([id])=>id===page);
  const currentGuides=guideLibrary[page]??[];
  const libraryText=libraryUi[lang]??libraryUi.en;
  const guideAction=guideActions[lang]??guideActions.en;
  const currentGearDetails=gearDetails[lang]??gearDetails.en;
  const CurrentIcon=categoryPage?.[1]??BookOpen;

  return <>
    <header className="site-header">
      <div className="header">
        <button className="brand" onClick={()=>go('home')} aria-label={t.home}>
          <img className="brand-avatar" src="/images/logo-us4a-guides.png" alt="Emblème US4A GUIDES" width="46" height="46"/>
          <span>US4A <b>— GUIDES</b><small>{t.subtitle}</small></span>
        </button>
        <button className="hamburger" aria-label={t.menu} aria-expanded={mobile} aria-controls="main-navigation" onClick={()=>setMobile(open=>!open)}><Menu/></button>
        <nav id="main-navigation" className={mobile?'open':''} aria-label={t.menu}>
          {navigation.map(([id,Icon,label])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>go(id)}><Icon size={16}/>{label}</button>)}
        </nav>
        <label className="language">
          <Languages size={17}/><span className="sr-only">{t.language}</span>
          <select aria-label={t.language} value={lang} onChange={event=>{setLang(event.target.value);setSelectedGuide(null)}}>
            {Object.entries(languageNames).map(([code,label])=><option key={code} value={code}>{label}</option>)}
          </select>
        </label>
      </div>
    </header>
    <main>
      {page==='home'?<>
        <section className="hero" aria-labelledby="hero-title">
          <picture className="hero-art" aria-hidden="true">
            <source media="(max-width: 640px)" srcSet="/images/us4a-hero-mobile.png"/>
            <img src="/images/us4a-hero-desktop.png" alt=""/>
          </picture>
          <div className="hero-content">
            <div className="eyebrow">{t.hub}</div>
            <h1 id="hero-title">{t.welcome}</h1>
            <p>{t.intro}</p>
            <button type="button" className="hero-cta" onClick={()=>go('guides')}><BookOpen size={20}/>{t.read} — {t.guides}</button>
          </div>
        </section>
      </>:page==='guides'?<section className="guides-overview">
        <div className="guides-overview-header">
          <div className="eyebrow">US4A — GUIDES</div>
          <h1>{t.guides}</h1>
          <p>{totalGuides} {libraryText.guides}</p>
          <label className="search">
            <Search size={20}/><span className="sr-only">{t.search}</span>
            <input type="search" placeholder={t.search} value={query} onChange={event=>setQuery(event.target.value)}/>
          </label>
        </div>
        {matches.length?<div className="cards">{matches.map(([id,Icon,label,image])=><button className="card" key={id} onClick={()=>go(id)}><img src={image} alt="" width="720" height="720" loading="lazy"/><span className="card-overlay" aria-hidden="true"/><span className="card-copy"><Icon size={25}/><strong className="card-title">{label}</strong><span>{t.read} <b aria-hidden="true">→</b></span></span></button>)}</div>:<p className="no-results">{t.noResults}</p>}
      </section>:page==='alliance'?<AllianceContest onOpenGuides={()=>go('alliance-duel')}/>:categoryPage?<section className="category-page">
        <button className="back-button" onClick={()=>go('guides')}><ArrowLeft size={18}/>{t.guides}</button>
        <div className="category-hero">
          <img src={categoryPage[3]} alt="" width="720" height="720"/>
          <span className="category-hero-shade" aria-hidden="true"/>
          <div className="category-hero-copy"><div className="eyebrow">US4A — GUIDES</div><h1>{categoryPage[2]}</h1><p>{currentGuides.length} {currentGuides.length===1?libraryText.guide:libraryText.guides}</p></div>
        </div>
        {page==='gear'?<section className="quick-notes"><div className="eyebrow">{libraryText.quickNotes}</div><div className="quick-notes-grid">{currentGearDetails.map(note=><article key={note.title}><h2>{note.title}</h2><ul>{note.bullets.map(bullet=><li key={bullet}>{bullet}</li>)}</ul></article>)}</div></section>:null}
        <div className="guide-list">{currentGuides.map((guide,index)=>{
          const localized=guide.localized?.[lang];
          const image=localized?.image??guide.image;
          const title=localized?.title??guide.title;
          return localized?<button type="button" className="guide-item guide-item-localized" key={guide.slug} onClick={()=>setSelectedGuide({image,title})} aria-label={`${guideAction.view}: ${title}`}>
            <img src={image} alt="" width="1024" height="1536" loading="lazy"/>
            <span className="guide-item-shade" aria-hidden="true"/>
            <span className="guide-preview-badge"><ZoomIn size={16}/>{guideAction.view}</span>
            <span className="guide-item-copy"><span className="guide-number">{String(index+1).padStart(2,'0')}</span><span><h2>{title}</h2><p>{libraryText.guideSummary}</p></span></span>
          </button>:<article className="guide-item" key={guide.slug}>
            <img src={image} alt="" width="720" height="720" loading="lazy"/>
            <span className="guide-item-shade" aria-hidden="true"/>
            <div className="guide-item-copy"><span className="guide-number">{String(index+1).padStart(2,'0')}</span><div><h2>{title}</h2><p>{libraryText.guideSummary}</p></div></div>
          </article>;
        })}</div>
      </section>:<section className="inner"><CurrentIcon size={42}/><div className="eyebrow">US4A — GUIDES</div><h1>{t.guides}</h1><p>{t.soon}</p><div className="placeholder"><CurrentIcon size={40}/><span>{t.soon}</span></div></section>}
    </main>
    {selectedGuide?<div className="guide-modal" role="dialog" aria-modal="true" aria-label={selectedGuide.title} onClick={()=>setSelectedGuide(null)}>
      <div className="guide-modal-panel" onClick={event=>event.stopPropagation()}>
        <button type="button" className="guide-modal-close" onClick={()=>setSelectedGuide(null)}><X size={20}/>{guideAction.close}</button>
        <img src={selectedGuide.image} alt={selectedGuide.title} width="1024" height="1536"/>
      </div>
    </div>:null}
    <footer><span>US4A — GUIDES</span><span>{t.notice}</span></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
