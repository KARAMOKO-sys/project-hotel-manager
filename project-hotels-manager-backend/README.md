# PleasantStay — Backend

Backend du système de gestion hôtelière **PleasantStay**, construit avec
[NestJS](https://nestjs.com) et [Mongoose](https://mongoosejs.com) (MongoDB).

## Stack technique

| Domaine            | Technologie                              |
| ------------------ | ---------------------------------------- |
| Framework          | NestJS 11 (TypeScript)                   |
| Base de données    | MongoDB via Mongoose 9                   |
| Validation         | `class-validator` / `class-transformer`  |
| Documentation API  | Swagger (`@nestjs/swagger`)              |
| Tests              | Jest + `@nestjs/testing`                 |

## Architecture

Le code est organisé en **modules** (un dossier par domaine), chacun contenant :

```
src/<domaine>/
├── <domaine>.module.ts      # câblage NestJS + Mongoose
├── schemas/<domaine>.entity.ts
├── dto/create-<domaine>.dto.ts
├── dto/update-<domaine>.dto.ts
├── controllers/<domaine>.controller.ts
└── services/<domaine>.service.ts
```

### Couche commune (`src/common/`)

Pour éviter la duplication, une fondation réutilisable a été mise en place :

- **`BaseRepository`** (`common/repositories/base.repository.ts`) : opérations
  Mongoose de bas niveau (CRUD, suppression logique, restauration, comptage).
- **`BaseCrudService`** (`common/services/base-crud.service.ts`) : implémentation
  standard de `create`, `findAll` (paginé), `findOne`, `update`, `remove` et
  `restore`. Les services concrets étendent cette classe et injectent leur modèle.
- **`PaginationQueryDto`** (`common/dto/pagination-query.dto.ts`) : pagination
  (`page`, `limit`), tri (`sort`) et recherche (`search`).
- **`IdParamDto`** (`common/dto/id-param.dto.ts`) : validation des identifiants
  MongoDB dans les routes `:id`.

La **suppression logique** repose sur les champs `is_deleted` / `deleted_at`
définis dans `AuditableEntity` (`src/base-entities/embeddables/auditable.entity.ts`).

## Modules implémentés (avec services, contrôleurs et tests)

| Module         | Route de base  | Fonctionnalités clés                                     |
| -------------- | -------------- | -------------------------------------------------------- |
| `organization` | `/api/organizations` | CRUD, paramètres, membres (`addMember`, `removeMember`, `getMembers`), statistiques |
| `property`     | `/api/properties`    | CRUD, recherche par organisation/propriétaire, paramètres, chambres & types de chambres |
| `room-type`    | `/api/room-types`    | CRUD, prix de base, chambres rattachées                  |
| `room`         | `/api/rooms`         | CRUD, statut, blocage, chambres disponibles/maintenance  |
| `guest`        | `/api/guests`        | CRUD, recherche, profil, activation, points de fidélité  |
| `role`         | `/api/roles`         | CRUD, permissions, recherche, statistiques (déjà existant, tests complétés) |
| `reservation`  | `/api/reservations`  | CRUD, code de confirmation, cycle de vie (confirmer, annuler, check-in/out, no-show), arrivées/départs |
| `reservation-room` | `/api/reservation-rooms` | CRUD, chambres rattachées à une réservation |
| `invoice`      | `/api/invoices`      | CRUD, numéro auto, lignes de facture (`addItem`/`removeItem`), cycle de vie (payée, en retard, annulée), impayés |
| `invoice-item` | `/api/invoice-items` | CRUD, lignes de facture avec calcul du total |
| `payment`      | `/api/payments`      | CRUD, numéro auto, monnaie rendue, remboursement, transaction, rapport de caisse journalier |
| `housekeeping` | `/api/housekeeping`  | CRUD, assignation, démarrage, complétion, report, planning par employé/chambre, tâches en attente |
| `maintenance-request` | `/api/maintenance-requests` | CRUD, assignation, démarrage, complétion, annulation, demandes urgentes |
| `guest-request` | `/api/guest-requests` | CRUD, assignation, complétion, annulation, demandes par client/chambre, en attente |
| `guest-preference` | `/api/guest-preferences` | CRUD, préférences par client, mise à jour/upsert, suppression, recommandations |
| `guest-segment` | `/api/guest-segments` | CRUD, segments par propriété, activation/désactivation, statistiques |
| `campaign`     | `/api/campaigns`     | CRUD, programmation, annulation, envoi, statistiques |
| `campaign-analytic` | `/api/campaign-analytics` | Suivi des ouvertures/clics/conversions, statistiques temps réel |

### Exemple d'endpoints

```
POST   /api/organizations
GET    /api/organizations?page=1&limit=10&sort=-created_at
GET    /api/organizations/:id
PATCH  /api/organizations/:id
DELETE /api/organizations/:id
GET    /api/organizations/:id/members
POST   /api/organizations/:id/members
DELETE /api/organizations/:id/members/:userId

GET    /api/properties/organization/:organizationId
GET    /api/properties/:id/rooms
GET    /api/properties/:id/room-types

PATCH  /api/rooms/:id/status
PATCH  /api/rooms/:id/block
GET    /api/rooms/property/:propertyId/available

POST   /api/guests/:id/loyalty-points
GET    /api/guests/:id/loyalty-history
```

La documentation Swagger est disponible sur `http://localhost:3000/api/docs`.

## Variables d'environnement

Copiez `.env.example` vers `.env` puis renseignez :

| Variable          | Description                        | Exemple                        |
| ----------------- | ---------------------------------- | ------------------------------ |
| `PORT`            | Port HTTP                          | `3000`                         |
| `MONGODB_URI`     | URI de connexion MongoDB           | `mongodb://localhost:27017`    |
| `MONGODB_DB_NAME` | Nom de la base                     | `bd_pleasantstay`              |
| `CORS_ORIGIN`     | Origines CORS (séparées par `,`)   | `http://localhost:4200`        |

## Commandes

```bash
# Installation
npm install

# Développement (watch)
npm run start:dev

# Compilation
npm run build

# Tests unitaires
npm test

# Tests avec couverture
npm run test:cov

# Tests end-to-end
npm run test:e2e

# Lint (auto-fix)
npm run lint
```

## Tests

La suite couvre **94 suites / 182 tests**, dont :

- `common/services/base-crud.service.spec.ts` — comportement du CRUD générique ;
- un spec de service et de contrôleur pour chaque module implémenté ;
- le spec du service `role` (corrigé pour fournir le modèle Mongoose mocké).

Les tests de service mockent le modèle Mongoose (`getModelToken(...)`) pour rester
isolés de la base de données.

## Statut / Prochaines étapes

La fondation et les modules métier cœur (établissements, chambres, clients, rôles,
réservations, facturation, paiements, opérations et CRM) sont implémentés et
testés. Les modules restants (tarification, IA, intégrations, reporting, POS,
taxe, waitlist…) sont encore des squelettes générés par la CLI et doivent être
implémentés selon le même patron. Voir `README_SOLO.md` pour la liste complète
des services attendus.

Pour implémenter un nouveau module, il suffit de :

1. compléter l'entité (`schemas/*.entity.ts`) ;
2. remplir les DTOs (`dto/`) avec la validation ;
3. étendre `BaseCrudService` dans le service et ajouter les méthodes métier ;
4. câbler `MongooseModule.forFeature` dans le module ;
5. écrire les specs service + contrôleur.
