const makeGuides=(category,items)=>items.map(([title,slug,localized={}])=>({
  title,
  slug,
  image:`/images/guides/${category}/${slug}.jpg`,
  localized:Object.fromEntries(Object.entries(localized).map(([language,localizedTitle])=>[
    language,
    {title:localizedTitle,image:`/images/guides/${language}/${category}/${slug}.jpg`}
  ]))
}));

export const guideLibrary={
  'alliance-duel':makeGuides('alliance-duel',[
    ['Alliance Duel Overview','alliance-duel-overview',{fr:'Duel d’alliance — guide complet',en:'Alliance Duel — Complete Guide'}],
    ['Daily Checklist','daily-checklist',{fr:'Liste quotidienne du Duel',en:'Alliance Duel — Daily Checklist'}],
    ['Day 0 — Sunday Setup','day-0-sunday-setup',{fr:'Jour 0 — préparation du dimanche',en:'Day 0 — Sunday Setup'}],
    ['Day 1','day-1',{fr:'Jour 1 — ressources de la ville',en:'Day 1 — City Resources'}],
    ['Day 2','day-2',{fr:'Jour 2 — construction et activités',en:'Day 2 — Construction & Activities'}],
    ['Day 3','day-3',{fr:'Jour 3 — recherche et ressources',en:'Day 3 — Research & Resources'}],
    ['Day 4 — Hero Day','day-4-hero-day',{fr:'Jour 4 — jour des héros',en:'Day 4 — Hero Day'}],
    ['Day 5','day-5',{fr:'Jour 5 — entraînement et primes',en:'Day 5 — Training & Bounties'}],
    ['Day 6','day-6',{fr:'Jour 6 — collecte et puissance',en:'Day 6 — Gathering & Power'}]
  ]),
  routines:makeGuides('routines',[
    ['Every Day in an Alliance','every-day-in-an-alliance',{fr:'Chaque jour dans une alliance',en:'Every Day in an Alliance'}],
    ['Weekly Alliance Tasks','weekly-alliance-tasks',{fr:'Tâches hebdomadaires de l’alliance',en:'Weekly Alliance Tasks'}],
    ['Bounty Tasks Guide','bounty-tasks-guide',{fr:'Guide des tâches de prime',en:'Bounty Tasks Guide'}]
  ]),
  'heroes-squads':makeGuides('heroes-squads',[
    ['Hero Faction Counter','hero-faction-counter',{fr:'Contres des factions de héros',en:'Hero Faction Counters'}],
    ['Squad & Hero Basics','squad-and-hero-basics',{fr:'Bases des escouades et des héros',en:'Squad & Hero Basics'}],
    ['Hero Placement','hero-placement',{fr:'Placement des héros',en:'Hero Placement'}],
    ['Tribe Formation','tribe-formation',{fr:'Formation Tribu',en:'Tribe Formation'}],
    ['Wall of Honor','wall-of-honor',{fr:'Mur d’honneur',en:'Wall of Honor'}],
    ['Hero Power Upgrade Bonuses','hero-power-upgrade-bonuses',{fr:'Bonus de puissance des héros',en:'Hero Power Bonuses'}]
  ]),
  gear:makeGuides('gear',[
    ['Gear Basics','gear-basics',{fr:'Bases de l’équipement',en:'Gear Basics'}],
    ['Gear Promotion','gear-promotion',{fr:'Promotion d’équipement',en:'Gear Promotion'}],
    ['Dragonslayer Gear','dragonslayer-gear',{fr:'Épée tueuse de dragons',en:'Dragonslayer Gear'}]
  ]),
  'troops-training':makeGuides('troops-training',[
    ['Troop Soldier Levels','troop-soldier-levels',{fr:'Niveaux des soldats',en:'Soldier Level Guide'}],
    ['Waterfall Training','waterfall-training',{fr:'Entraînement en cascade',en:'Waterfall Training'}]
  ]),
  buildings:makeGuides('buildings',[
    ['Base Building Guide','base-building-guide',{fr:'Guide complet des bâtiments de base',en:'Base Building Guide'}],
    ['Castle Upgrade Costs','castle-upgrade-costs',{fr:'Coûts d’amélioration du château',en:'Castle Upgrade Costs'}],
    ['Barracks Upgrade Costs','barracks-upgrade-costs',{fr:'Coûts d’amélioration des casernes',en:'Barracks Upgrade Costs'}],
    ['Drill Ground Upgrade Costs','drill-ground-upgrade-costs',{fr:'Coûts d’amélioration du terrain d’exercice',en:'Drill Ground Upgrade Costs'}],
    ['Scholar Tower I Upgrade Costs','scholar-tower-i-upgrade-costs',{fr:'Coûts d’amélioration de la tour des érudits I',en:'Scholar Tower I Upgrade Costs'}]
  ]),
  'bosses-events':makeGuides('bosses-events',[
    ['Tusk Berserker (Mon–Thu)','tusk-berserker-mon-thu',{fr:'Tusk Berserker (lun.–jeu.)'}],
    ['Tusk Boarlord (Tue–Fri)','tusk-boarlord-tue-fri',{fr:'Tusk Boarlord (mar.–ven.)'}],
    ['Tusk Butcher (Wed–Sat)','tusk-butcher-wed-sat',{fr:'Tusk Butcher (mer.–sam.)'}],
    ['Imperial Enforcer Hunt','imperial-enforcer-hunt',{fr:'Chasse aux Exécuteurs impériaux'}],
    ['Imperial Pursuer Rally','imperial-pursuer-rally',{fr:'Traqueur impérial — guide de ralliement'}],
    ['Vanguard Marshall','vanguard-marshall',{fr:'Maréchal de l’avant-garde'}],
    ['Tusk Spoils Rush','tusk-spoils-rush',{fr:'Ruée vers le butin Tusk'}],
    ['Caravan Trade','caravan-trade',{fr:'Commerce de caravanes'}],
    ['Race to Ace','race-to-ace',{fr:'Race to Ace'}],
    ['Boat Captain Guide','boat-captain-guide',{fr:'Guide du capitaine de bateau'}],
    ['Tusk Vanguard','tusk-vanguard',{fr:'Avant-garde Tusk'}]
  ]),
  'combat-rallies':makeGuides('combat-rallies',[
    ['Ambush Rally','ambush-rally',{fr:'Ralliement embuscade'}],
    ['Surprise Rally','surprise-rally',{fr:'Ralliement surprise'}],
    ['Surviving SvS','surviving-svs',{fr:'Survivre au SvS'}],
    ['Arena Strategy','arena-strategy',{fr:'Stratégie d’arène'}],
    ['Ambush Rally Ready Check','ambush-rally-ready-check',{fr:'Vérification « Prêt » — ralliement embuscade'}],
    ['Gold Mine Conquest','gold-mine-conquest',{fr:'Conquête de la mine d’or'}],
    ['Wall Defense Setup','wall-defense-setup',{fr:'Configuration de la défense du mur'}]
  ]),
  'community-rules':makeGuides('community-rules',[
    ['In-Server Attack Policy','in-server-attack-policy',{fr:'Attaques internes — bonnes pratiques'}],
    ['Alliance Plundering Rulebook','alliance-plundering-rulebook',{fr:'Pillage sans toucher aux alliés'}],
    ['Server-Wide Response','server-wide-response',{fr:'Incident interne — résolution'}],
    ['City Capture Rules','city-capture-rules',{fr:'Capture d’une ville — protocole'}],
    ['Discord Rules','discord-rules',{fr:'Communication d’alliance'}],
    ['Discord iTranslator','discord-itranslator',{fr:'Traduire un message'}],
    ['Kingdom Titles & Favor','kingdom-titles-and-favor',{fr:'Titres du royaume & faveurs'}],
    ['Royal Favor Buffs','royal-favor-buffs',{fr:'Bonus de faveur royale'}],
    ['NAP 15 Relocation Guide','nap-15-relocation-guide',{fr:'Défense de la capitale — placement'}],
    ['Target Identification Guide','target-identification-guide',{fr:'Identifier les cibles'}],
    ['RSS Tile Etiquette','rss-tile-etiquette',{fr:'Respect des cases de ressources'}]
  ])
};

export const libraryUi={
  fr:{guide:'guide',guides:'guides',quickNotes:'Conseils US4A',guideSummary:'Étapes, priorités et coûts utiles, directement dans US4A GUIDES.'},
  en:{guide:'guide',guides:'guides',quickNotes:'US4A advice',guideSummary:'Useful steps, priorities and costs, directly inside US4A GUIDES.'},
  es:{guide:'guía',guides:'guías',quickNotes:'Consejos US4A',guideSummary:'Pasos, prioridades y costes útiles, directamente en US4A GUIDES.'},
  de:{guide:'Guide',guides:'Guides',quickNotes:'US4A-Tipps',guideSummary:'Nützliche Schritte, Prioritäten und Kosten direkt in US4A GUIDES.'},
  ru:{guide:'гайд',guides:'гайдов',quickNotes:'Советы US4A',guideSummary:'Шаги, приоритеты и затраты прямо в US4A GUIDES.'},
  tr:{guide:'rehber',guides:'rehber',quickNotes:'US4A önerileri',guideSummary:'Adımlar, öncelikler ve maliyetler doğrudan US4A GUIDES içinde.'},
  ko:{guide:'가이드',guides:'가이드',quickNotes:'US4A 조언',guideSummary:'단계, 우선순위와 비용을 US4A GUIDES에서 바로 확인하세요.'},
  ar:{guide:'دليل',guides:'أدلة',quickNotes:'نصائح US4A',guideSummary:'الخطوات والأولويات والتكاليف مباشرة داخل US4A GUIDES.'}
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
