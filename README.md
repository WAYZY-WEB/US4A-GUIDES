# Top Lords Guides — Phase 1

Prototype public React/Vite, avec interface responsive, navigation et langues FR/EN/RU/TR.

## Démarrer localement

Installer Node.js 20.19+ ou 22.12+, puis :

```bash
npm install
npm run dev
```

## Publier gratuitement

1. Créer un dépôt GitHub et y importer les fichiers du projet.
2. Dans Cloudflare Workers & Pages, créer un projet Pages connecté au dépôt GitHub.
3. Configuration : **Build command** `npm run build`, **Build output directory** `dist`.
4. Déployer. Une URL `*.pages.dev` sera générée.

## Important : sécurité

Cette phase ne contient **aucune donnée privée, aucun code d'accès réel et aucune authentification**. Le bouton US4A indique « bientôt disponible » volontairement. Ne jamais stocker un code d'accès dans le JavaScript public ou masquer des données privées uniquement avec CSS/React.

## Phase 2

Ajouter une API serveur (Cloudflare Workers), un secret de code US4A haché, une limitation des tentatives, une session signée dans un cookie HttpOnly/Secure/SameSite, et un contrôle serveur de chaque lecture privée. Connecter Supabase avec des politiques d'accès adaptées. Prévoir un accès administrateur distinct et renforcé.

Les textes des catégories sont des éléments de démonstration. Les statistiques de héros et guides devront être documentés et vérifiés avant publication.
