This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result. The backend should be running on port `3000`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backoffice et personnalisation du site

Le backoffice est disponible sur `/backoffice`. Il nécessite un compte
administrateur du backend et propose une vue d’ensemble ainsi qu’un catalogue
de gestion relié aux modules de l’API. Les enregistrements sont édités au
format JSON conforme aux DTO du backend ; les opérations non autorisées restent
refusées par les rôles et permissions de l’API.

La page `/backoffice/site` permet au super-administrateur de modifier l’identité
du site, son thème, les contenus de la bannière et des sections de présentation,
ainsi que l’affichage des sections de la page d’accueil. Les changements sont
persistés dans la collection MongoDB `site_configs` du backend. La lecture de
`GET /api/site-config` est publique ; la mise à jour via
`PATCH /api/site-config` nécessite le rôle `super_admin`.

Lancer le backend sur le port `3000`, puis le frontend avec `npm run dev` (port
`3001`). Si l’API utilise une autre adresse, définir
`NEXT_PUBLIC_BACKEND_API_URL` (par exemple `http://localhost:3000/api`).
L’interface du backoffice et les pages publiques s’adaptent aux écrans mobiles,
tablettes et ordinateurs.

## Lancer toute la stack avec Docker

Depuis la racine du dépôt (le dossier qui contient `docker-compose.yml`) :

```bash
docker compose up --build
```

Le frontend est accessible sur [http://localhost:3001](http://localhost:3001),
l’application React/Vite sur [http://localhost:3002](http://localhost:3002),
l’API sur [http://localhost:3000/api](http://localhost:3000/api) et Swagger sur
[http://localhost:3000/api/docs](http://localhost:3000/api/docs). MongoDB écoute
sur le port `27017` et ses données persistent dans le volume `mongo_data`.

Les variables `NEXT_PUBLIC_API_URL` et `NEXT_PUBLIC_BACKEND_API_URL` sont
intégrées au frontend lors de sa construction. Pour une autre adresse d’API,
définissez-les avant `docker compose up --build`. La valeur `JWT_SECRET` par
défaut est réservée au développement local ; définissez une valeur secrète
forte dans l’environnement pour tout déploiement.

Arrêter les conteneurs avec `docker compose down`. Pour supprimer aussi les
données MongoDB locales, utilisez `docker compose down --volumes`.
