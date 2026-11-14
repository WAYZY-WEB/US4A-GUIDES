const sourceRoot='https://toplordsguides.netlify.app/g';

const makeGuides=(category,items)=>items.map(([title,slug])=>({title,source:`${sourceRoot}/${category}/${slug}/`}));

export const guideLibrary={
  'alliance-duel':makeGuides('alliance-duel',[
    ['Alliance Duel Overview','alliance-duel-overview'],
    ['Daily Checklist','daily-checklist'],
    ['Day 0 — Sunday Setup','day-0-sunday-setup'],
    ['Day 1','day-1'],
    ['Day 2','day-2'],
    ['Day 3','day-3'],
    ['Day 4 — Hero Day','day-4-hero-day'],
    ['Day 5','day-5'],
    ['Day 6','day-6']
  ]),
  routines:makeGuides('daily-and-weekly-routines',[
    ['Every Day in an Alliance','every-day-in-an-alliance'],
    ['Weekly Alliance Tasks','weekly-alliance-tasks'],
    ['Bounty Tasks Guide','bounty-tasks-guide']
  ]),
  'heroes-squads':makeGuides('heroes-and-squads',[
    ['Hero Faction Counter','hero-faction-counter'],
    ['Squad & Hero Basics','squad-and-hero-basics'],
    ['Hero Placement','hero-placement'],
    ['Tribe Formation','tribe-formation'],
    ['Wall of Honor','wall-of-honor'],
    ['Hero Power Upgrade Bonuses','hero-power-upgrade-bonuses']
  ]),
  gear:makeGuides('gear',[
    ['Gear Basics','gear-basics'],
    ['Gear Promotion','gear-promotion'],
    ['Dragonslayer Gear','dragonslayer-gear']
  ]),
  'troops-training':makeGuides('troops-and-training',[
    ['Troop Soldier Levels','troop-soldier-levels'],
    ['Waterfall Training','waterfall-training']
  ]),
  buildings:makeGuides('buildings',[
    ['Base Building Guide','base-building-guide'],
    ['Castle Upgrade Costs','castle-upgrade-costs'],
    ['Barracks Upgrade Costs','barracks-upgrade-costs'],
    ['Drill Ground Upgrade Costs','drill-ground-upgrade-costs'],
    ['Scholar Tower I Upgrade Costs','scholar-tower-i-upgrade-costs']
  ]),
  'bosses-events':makeGuides('bosses-and-events',[
    ['Tusk Berserker (Mon–Thu)','tusk-berserker-mon-thu'],
    ['Tusk Boarlord (Tue–Fri)','tusk-boarlord-tue-fri'],
    ['Tusk Butcher (Wed–Sat)','tusk-butcher-wed-sat'],
    ['Imperial Enforcer Hunt','imperial-enforcer-hunt'],
    ['Imperial Pursuer Rally','imperial-pursuer-rally'],
    ['Vanguard Marshall','vanguard-marshall'],
    ['Tusk Spoils Rush','tusk-spoils-rush'],
    ['Caravan Trade','caravan-trade'],
    ['Race to Ace','race-to-ace'],
    ['Boat Captain Guide','boat-captain-guide'],
    ['Tusk Vanguard','tusk-vanguard']
  ]),
  'combat-rallies':makeGuides('combat-and-rallies',[
    ['Ambush Rally','ambush-rally'],
    ['Surprise Rally','surprise-rally'],
    ['Surviving SvS','surviving-svs'],
    ['Arena Strategy','arena-strategy'],
    ['Ambush Rally Ready Check','ambush-rally-ready-check'],
    ['Gold Mine Conquest','gold-mine-conquest'],
    ['Wall Defense Setup','wall-defense-setup']
  ]),
  'community-rules':makeGuides('server-23-rules-and-discord',[
    ['In-Server Attack Policy','in-server-attack-policy'],
    ['Alliance Plundering Rulebook','alliance-plundering-rulebook'],
    ['Server-Wide Response','server-wide-response'],
    ['City Capture Rules','city-capture-rules'],
    ['Discord Rules','discord-rules'],
    ['Discord iTranslator','discord-itranslator'],
    ['Kingdom Titles & Favor','kingdom-titles-and-favor'],
    ['Royal Favor Buffs','royal-favor-buffs'],
    ['NAP 15 Relocation Guide','nap-15-relocation-guide'],
    ['Target Identification Guide','target-identification-guide'],
    ['RSS Tile Etiquette','rss-tile-etiquette']
  ])
};

export const libraryUi={
  fr:{guide:'guide',guides:'guides',openSource:'Voir la fiche source',sourceNote:'Index adapté à partir de Top Lords Guides. Les informations restent liées à leur source afin de respecter le travail original.',quickNotes:'Résumé US4A',guideSummary:'Fiche pratique avec les étapes, priorités et coûts utiles pour ce sujet.'},
  en:{guide:'guide',guides:'guides',openSource:'Open source guide',sourceNote:'Index adapted from Top Lords Guides. Information remains linked to its source to credit the original work.',quickNotes:'US4A summary',guideSummary:'Practical reference covering the useful steps, priorities and costs for this topic.'},
  es:{guide:'guía',guides:'guías',openSource:'Abrir guía fuente',sourceNote:'Índice adaptado de Top Lords Guides, con enlaces a la fuente original.',quickNotes:'Resumen US4A',guideSummary:'Ficha práctica sobre los pasos, prioridades y costes de este tema.'},
  de:{guide:'Guide',guides:'Guides',openSource:'Quellguide öffnen',sourceNote:'An Top Lords Guides angepasster Index mit Verweisen auf die Originalquelle.',quickNotes:'US4A-Zusammenfassung',guideSummary:'Praktische Übersicht zu Schritten, Prioritäten und Kosten dieses Themas.'},
  ru:{guide:'гайд',guides:'гайдов',openSource:'Открыть источник',sourceNote:'Индекс адаптирован из Top Lords Guides со ссылками на оригинальный источник.',quickNotes:'Кратко US4A',guideSummary:'Практическая справка по шагам, приоритетам и затратам.'},
  tr:{guide:'rehber',guides:'rehber',openSource:'Kaynak rehberi aç',sourceNote:'Top Lords Guides kaynağından uyarlanan ve orijinal kaynağa bağlanan dizin.',quickNotes:'US4A özeti',guideSummary:'Bu konunun adımlarını, önceliklerini ve maliyetlerini özetleyen pratik rehber.'},
  ko:{guide:'가이드',guides:'가이드',openSource:'원본 가이드 열기',sourceNote:'Top Lords Guides를 바탕으로 구성했으며 원본 출처로 연결됩니다.',quickNotes:'US4A 요약',guideSummary:'이 주제의 단계, 우선순위와 비용을 정리한 실용 가이드입니다.'},
  ar:{guide:'دليل',guides:'أدلة',openSource:'فتح الدليل الأصلي',sourceNote:'فهرس مقتبس من Top Lords Guides مع روابط إلى المصدر الأصلي.',quickNotes:'ملخص US4A',guideSummary:'مرجع عملي يوضح الخطوات والأولويات والتكاليف المفيدة لهذا الموضوع.'}
};

export const gearDetails={
  fr:[
    {title:'Bases de l’équipement',bullets:['Quatre pièces principales : épée, armure, jambières et brassards.','Le niveau maximal est 40, avec des bonus importants tous les 10 niveaux.','Priorité conseillée : équipe principale au niveau 10, puis épée 40, armure et jambières, brassards en dernier.']},
    {title:'Promotion après le niveau 40',bullets:['Chaque promotion remplit un emplacement et améliore un attribut supplémentaire.','Le cinquième emplacement débloque le bonus majeur de la pièce.','Conserver les matériaux pour le jour 5 du Duel d’alliance permet de marquer des points en même temps.']},
    {title:'Épée Dragonslayer',bullets:['Le parcours complet demande le niveau 40, cinq étoiles puis la promotion mythique.','Budget indicatif total : 584 M d’or, 759 K de minerai, 199,6 K de fer et 75 plans environ.','La promotion mythique ajoute une forte puissance et un bonus de dégâts du héros.']}
  ],
  en:[
    {title:'Gear basics',bullets:['Four core pieces: sword, armor, greaves and bracers.','Maximum level is 40, with important bonuses every 10 levels.','Suggested priority: main squad to level 10, sword to 40, armor and greaves next, bracers last.']},
    {title:'Promotion after level 40',bullets:['Each promotion fills a slot and improves an extra attribute.','The fifth slot unlocks the item’s major bonus.','Saving materials for Alliance Duel day 5 lets the same spend score event points.']},
    {title:'Dragonslayer sword',bullets:['The full path requires level 40, five stars and a final Mythic promotion.','Indicative total: 584 M gold, 759 K ore, 199.6 K iron and about 75 drafts.','Mythic promotion adds substantial power and a hero-damage bonus.']}
  ]
};
