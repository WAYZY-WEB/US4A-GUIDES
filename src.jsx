import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{BookOpen,Calculator,CalendarDays,Castle,Home,Languages,Lock,Menu,Search,Shield,Swords,Trophy}from'lucide-react';
import'./style.css';

const strings={
  fr:{language:'Langue',menu:'Ouvrir le menu',subtitle:'Guides et stratégies communautaires',home:'Accueil',hub:'Centre de stratégie communautaire',welcome:'Le Panthéon des Dieux',intro:'Guides, héros, événements et outils pour maîtriser Top Lords.',guides:'Guides',heroes:'Héros & PvP',tools:'Outils',events:'Événements',contest:'Concours',alliance:'Alliance',private:'Espace privé de l’alliance',privateDesc:'L’accès sécurisé par code sera activé en phase 2. Aucun contenu privé n’est exposé dans cette version.',soon:'Bientôt disponible',search:'Rechercher une rubrique…',read:'Explorer',noResults:'Aucune rubrique ne correspond à votre recherche.',notice:'Prototype public : aucune authentification ni base de données configurée.'},
  en:{language:'Language',menu:'Open menu',subtitle:'Community guides and strategies',home:'Home',hub:'Community strategy hub',welcome:'The Pantheon of Gods',intro:'Guides, heroes, events and tools to master Top Lords.',guides:'Guides',heroes:'Heroes & PvP',tools:'Tools',events:'Events',contest:'Contest',alliance:'Alliance',private:'Private alliance area',privateDesc:'Secure code access will be enabled in phase 2. No private content is exposed in this version.',soon:'Coming soon',search:'Search a section…',read:'Explore',noResults:'No section matches your search.',notice:'Public prototype: no authentication or database configured.'},
  es:{language:'Idioma',menu:'Abrir menú',subtitle:'Guías y estrategias de la comunidad',home:'Inicio',hub:'Centro de estrategia comunitaria',welcome:'El Panteón de los Dioses',intro:'Guías, héroes, eventos y herramientas para dominar Top Lords.',guides:'Guías',heroes:'Héroes y PvP',tools:'Herramientas',events:'Eventos',contest:'Concurso',alliance:'Alianza',private:'Área privada de la alianza',privateDesc:'El acceso seguro por código se activará en la fase 2. Esta versión no expone contenido privado.',soon:'Próximamente',search:'Buscar una sección…',read:'Explorar',noResults:'Ninguna sección coincide con tu búsqueda.',notice:'Prototipo público: sin autenticación ni base de datos configurada.'},
  de:{language:'Sprache',menu:'Menü öffnen',subtitle:'Community-Guides und Strategien',home:'Start',hub:'Community-Strategiezentrum',welcome:'Das Pantheon der Götter',intro:'Guides, Helden, Events und Werkzeuge für Top Lords.',guides:'Guides',heroes:'Helden & PvP',tools:'Werkzeuge',events:'Events',contest:'Wettbewerb',alliance:'Allianz',private:'Privater Allianzbereich',privateDesc:'Der sichere Codezugang wird in Phase 2 aktiviert. Diese Version zeigt keine privaten Inhalte.',soon:'Demnächst verfügbar',search:'Bereich suchen…',read:'Entdecken',noResults:'Kein Bereich entspricht deiner Suche.',notice:'Öffentlicher Prototyp: keine Anmeldung oder Datenbank eingerichtet.'},
  ru:{language:'Язык',menu:'Открыть меню',subtitle:'Гайды и стратегии сообщества',home:'Главная',hub:'Центр стратегии сообщества',welcome:'Пантеон Богов',intro:'Гайды, герои, события и инструменты для Top Lords.',guides:'Гайды',heroes:'Герои и PvP',tools:'Инструменты',events:'События',contest:'Конкурс',alliance:'Альянс',private:'Закрытый раздел альянса',privateDesc:'Доступ по коду появится на втором этапе. Закрытые данные сейчас не опубликованы.',soon:'Скоро',search:'Найти раздел…',read:'Открыть',noResults:'По вашему запросу ничего не найдено.',notice:'Публичный прототип: авторизация и база данных пока не настроены.'},
  tr:{language:'Dil',menu:'Menüyü aç',subtitle:'Topluluk rehberleri ve stratejileri',home:'Ana sayfa',hub:'Topluluk strateji merkezi',welcome:'Tanrıların Panteonu',intro:'Top Lords için rehberler, kahramanlar, etkinlikler ve araçlar.',guides:'Rehberler',heroes:'Kahramanlar ve PvP',tools:'Araçlar',events:'Etkinlikler',contest:'Yarışma',alliance:'İttifak',private:'Özel ittifak alanı',privateDesc:'Güvenli kod erişimi ikinci aşamada açılacak. Özel içerik bu sürümde yayınlanmaz.',soon:'Yakında',search:'Bölüm ara…',read:'Keşfet',noResults:'Aramanızla eşleşen bölüm yok.',notice:'Herkese açık prototip: kimlik doğrulama ve veritabanı henüz kurulmadı.'},
  ko:{language:'언어',menu:'메뉴 열기',subtitle:'커뮤니티 가이드와 전략',home:'홈',hub:'커뮤니티 전략 허브',welcome:'신들의 판테온',intro:'Top Lords를 위한 가이드, 영웅, 이벤트와 도구.',guides:'가이드',heroes:'영웅 & PvP',tools:'도구',events:'이벤트',contest:'콘테스트',alliance:'연맹',private:'연맹 전용 공간',privateDesc:'보안 코드 접속은 2단계에서 활성화됩니다. 이 버전에는 비공개 콘텐츠가 없습니다.',soon:'곧 공개됩니다',search:'섹션 검색…',read:'살펴보기',noResults:'검색과 일치하는 섹션이 없습니다.',notice:'공개 프로토타입: 인증과 데이터베이스가 아직 설정되지 않았습니다.'},
  ar:{language:'اللغة',menu:'فتح القائمة',subtitle:'أدلة واستراتيجيات المجتمع',home:'الرئيسية',hub:'مركز استراتيجيات المجتمع',welcome:'مجمع الآلهة',intro:'أدلة وأبطال وفعاليات وأدوات لإتقان Top Lords.',guides:'الأدلة',heroes:'الأبطال وPvP',tools:'الأدوات',events:'الفعاليات',contest:'المسابقة',alliance:'التحالف',private:'منطقة التحالف الخاصة',privateDesc:'سيتم تفعيل الدخول الآمن بالرمز في المرحلة الثانية. لا يظهر أي محتوى خاص في هذه النسخة.',soon:'قريبًا',search:'ابحث عن قسم…',read:'استكشف',noResults:'لا يوجد قسم يطابق بحثك.',notice:'نموذج عام: لم تتم تهيئة المصادقة أو قاعدة البيانات بعد.'}
};

const languageNames={fr:'FR',en:'EN',es:'ES',de:'DE',ru:'RU',tr:'TR',ko:'KO',ar:'AR'};

function App(){
  const[lang,setLang]=useState('fr');
  const[page,setPage]=useState('home');
  const[query,setQuery]=useState('');
  const[mobile,setMobile]=useState(false);
  const t=strings[lang];
  const sections=[
    ['guides',BookOpen,t.guides],
    ['heroes',Swords,t.heroes],
    ['tools',Calculator,t.tools],
    ['events',CalendarDays,t.events],
    ['contest',Trophy,t.contest],
    ['alliance',Shield,t.alliance]
  ];
  const navigation=[['home',Home,t.home],...sections];
  const matches=sections.filter(([, ,label])=>label.toLocaleLowerCase(lang).includes(query.trim().toLocaleLowerCase(lang)));

  useEffect(()=>{
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  },[lang]);

  function go(nextPage){
    setPage(nextPage);
    setMobile(false);
  }

  const current=sections.find(([id])=>id===page);
  const CurrentIcon=current?.[1]??BookOpen;

  return <>
    <header className="site-header">
      <div className="header">
        <button className="brand" onClick={()=>go('home')} aria-label={t.home}>
          <Castle size={30}/>
          <span>US4A <b>— GUIDES</b><small>{t.subtitle}</small></span>
        </button>
        <button className="hamburger" aria-label={t.menu} aria-expanded={mobile} aria-controls="main-navigation" onClick={()=>setMobile(open=>!open)}><Menu/></button>
        <nav id="main-navigation" className={mobile?'open':''} aria-label={t.menu}>
          {navigation.map(([id,Icon,label])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>go(id)}><Icon size={16}/>{label}</button>)}
        </nav>
        <label className="language">
          <Languages size={17}/><span className="sr-only">{t.language}</span>
          <select aria-label={t.language} value={lang} onChange={event=>setLang(event.target.value)}>
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
            <label className="search">
              <Search size={20}/><span className="sr-only">{t.search}</span>
              <input type="search" placeholder={t.search} value={query} onChange={event=>setQuery(event.target.value)}/>
            </label>
          </div>
        </section>
        {matches.length?<div className="cards">{matches.map(([id,Icon,label])=><button className="card" key={id} onClick={()=>go(id)}><Icon size={32}/><h2>{label}</h2><span>{t.read} <b aria-hidden="true">→</b></span></button>)}</div>:<p className="no-results">{t.noResults}</p>}
      </>:page==='alliance'?<section className="inner"><Shield size={42}/><h1>{t.private}</h1><p>{t.privateDesc}</p><div className="locked"><Lock size={22}/>{t.soon}</div></section>:<section className="inner"><CurrentIcon size={42}/><div className="eyebrow">US4A — GUIDES</div><h1>{current?.[2]}</h1><p>{t.soon}</p><div className="placeholder"><CurrentIcon size={40}/><span>{t.soon}</span></div></section>}
    </main>
    <footer><span>US4A — GUIDES · Community project</span><span>{t.notice}</span></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App/>);
