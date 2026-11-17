# PleasantStay — backoffice hôtelier

Backoffice Next.js connecté à l’API NestJS du projet
`project-hotels-manager-backend`.

## Configuration

Copiez `.env.example` vers `.env.local`, puis configurez :

- `NEXT_PUBLIC_API_URL` : URL du backend, préfixe `/api` inclus (par exemple
  `http://localhost:3000/api`).
- `NEXT_PUBLIC_DEMO_MODE` : `false` par défaut. Passez à `true` uniquement pour
  afficher des données de démonstration quand l’API ne répond pas.

Les requêtes authentifiées utilisent les jetons retournés par
`POST /api/auth/login`. Les pages de gestion et les formulaires CRUD sont
déclarés dans `src/lib/resources.ts` ; cette configuration alimente aussi le
menu, les colonnes, les champs et les endpoints.

## Développement et validation

```bash
npm run dev
npm run type-check
npm run build
```

Le frontend démarre sur `http://localhost:3001` afin de laisser le port `3000`
au backend. Configurez également CORS côté backend pour autoriser l’origine du
backoffice.
