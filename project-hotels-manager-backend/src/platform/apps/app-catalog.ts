/**
 * Catalogue des applications de PleasantStay, à la manière du magasin
 * d'applications d'Odoo : chaque organisation installe les applications dont
 * elle a besoin ; installer une application installe d'abord ses dépendances.
 *
 * - `core` : toujours installée, ne peut pas être désinstallée.
 * - `default_installed` : considérée comme installée tant que l'organisation
 *   ne l'a pas explicitement désinstallée (compatibilité avec l'existant).
 * - Les contrôleurs d'une application portent `@RequiresApp('<key>')`.
 */
export type AppCategory =
  | 'hotel'
  | 'sales'
  | 'finance'
  | 'operations'
  | 'human_resources'
  | 'marketing'
  | 'intelligence'
  | 'productivity'
  | 'integration';

export interface AppDefinition {
  key: string;
  name: string;
  summary: string;
  category: AppCategory;
  /** Icône PrimeIcons utilisée par le back-office. */
  icon: string;
  depends: string[];
  core?: boolean;
  default_installed?: boolean;
}

export const APP_CATEGORIES: Record<AppCategory, string> = {
  hotel: 'Hôtellerie',
  sales: 'Ventes',
  finance: 'Finance',
  operations: 'Opérations',
  human_resources: 'Ressources humaines',
  marketing: 'Marketing',
  intelligence: 'Intelligence artificielle',
  productivity: 'Productivité',
  integration: 'Intégrations',
};

export const APP_CATALOG: AppDefinition[] = [
  // Socle
  {
    key: 'base',
    name: 'Socle',
    summary:
      'Organisations, établissements, utilisateurs, rôles et journal d’audit.',
    category: 'productivity',
    icon: 'pi pi-cog',
    depends: [],
    core: true,
  },
  {
    key: 'front_desk',
    name: 'Réception (PMS)',
    summary:
      'Chambres, types de chambre, réservations, arrivées et départs, liste d’attente.',
    category: 'hotel',
    icon: 'pi pi-building',
    depends: ['base'],
    default_installed: true,
  },
  {
    key: 'revenue',
    name: 'Revenue management',
    summary:
      'Plans tarifaires, prix journaliers, tarification dynamique et taxes.',
    category: 'hotel',
    icon: 'pi pi-chart-line',
    depends: ['front_desk'],
    default_installed: true,
  },
  {
    key: 'channel_manager',
    name: 'Channel manager',
    summary:
      'Connexions OTA (Booking, Expedia, Airbnb, Agoda) et journal des webhooks.',
    category: 'hotel',
    icon: 'pi pi-share-alt',
    depends: ['front_desk', 'revenue'],
    default_installed: true,
  },
  {
    key: 'housekeeping',
    name: 'Gouvernance et maintenance',
    summary: 'Tâches de ménage, demandes de maintenance et demandes clients.',
    category: 'operations',
    icon: 'pi pi-check-square',
    depends: ['front_desk'],
    default_installed: true,
  },
  {
    key: 'billing',
    name: 'Facturation',
    summary: 'Factures, lignes de facture, paiements et caisse journalière.',
    category: 'finance',
    icon: 'pi pi-file',
    depends: ['base'],
    default_installed: true,
  },
  {
    key: 'pos',
    name: 'Point de vente',
    summary: 'Bar, restaurant, spa : tickets, articles, charges chambre.',
    category: 'sales',
    icon: 'pi pi-shopping-cart',
    depends: ['billing'],
    default_installed: true,
  },
  {
    key: 'guests',
    name: 'Clients',
    summary: 'Fiches clients, préférences, segments et demandes.',
    category: 'sales',
    icon: 'pi pi-users',
    depends: ['base'],
    default_installed: true,
  },
  {
    key: 'marketing',
    name: 'Marketing',
    summary: 'Campagnes, statistiques de campagne, newsletter et partenaires.',
    category: 'marketing',
    icon: 'pi pi-megaphone',
    depends: ['guests'],
    default_installed: true,
  },
  {
    key: 'ai',
    name: 'Intelligence hôtelière',
    summary:
      'Prévisions, chatbot, analyse de sentiment, recommandations, KPI et rapports.',
    category: 'intelligence',
    icon: 'pi pi-sparkles',
    depends: ['front_desk', 'guests'],
    default_installed: true,
  },
  {
    key: 'staff',
    name: 'Équipes',
    summary:
      'Affectations du personnel, réceptionnistes, gouvernantes, comptables.',
    category: 'human_resources',
    icon: 'pi pi-id-card',
    depends: ['base'],
    default_installed: true,
  },

  // Nouvelles applications ERP
  {
    key: 'accounting',
    name: 'Comptabilité',
    summary:
      'Plan comptable SYSCOHADA, journaux, écritures en partie double, grand livre, balance, comptabilisation automatique des ventes et des achats.',
    category: 'finance',
    icon: 'pi pi-calculator',
    depends: ['billing'],
  },
  {
    key: 'inventory',
    name: 'Stock',
    summary:
      'Articles, entrepôts, mouvements de stock, inventaires, seuils de réapprovisionnement.',
    category: 'operations',
    icon: 'pi pi-box',
    depends: ['base'],
  },
  {
    key: 'purchase',
    name: 'Achats',
    summary:
      'Fournisseurs, demandes de prix, bons de commande, réceptions et factures fournisseurs.',
    category: 'operations',
    icon: 'pi pi-truck',
    depends: ['inventory'],
  },
  {
    key: 'hr',
    name: 'Ressources humaines',
    summary:
      'Départements, contrats, congés avec validation, planning des équipes, pointage.',
    category: 'human_resources',
    icon: 'pi pi-briefcase',
    depends: ['staff'],
  },
  {
    key: 'crm',
    name: 'CRM',
    summary:
      'Pistes et opportunités (groupes, séminaires, entreprises), pipeline par étapes, comptes entreprises.',
    category: 'sales',
    icon: 'pi pi-filter',
    depends: ['guests'],
  },
  {
    key: 'loyalty',
    name: 'Fidélité',
    summary:
      'Programmes de fidélité, paliers, cumul et utilisation des points.',
    category: 'marketing',
    icon: 'pi pi-star',
    depends: ['guests'],
  },
  {
    key: 'activity',
    name: 'Discussion et activités',
    summary:
      'Fil d’activité sur chaque fiche : notes, abonnés, activités planifiées.',
    category: 'productivity',
    icon: 'pi pi-comments',
    depends: ['base'],
  },
  {
    key: 'studio',
    name: 'Studio',
    summary: 'Champs personnalisés ajoutés aux fiches sans développement.',
    category: 'productivity',
    icon: 'pi pi-pencil',
    depends: ['base'],
  },
  {
    key: 'automation',
    name: 'Automatisations',
    summary:
      'Règles « quand… si… alors… » déclenchées par les événements métier.',
    category: 'productivity',
    icon: 'pi pi-bolt',
    depends: ['base'],
  },
  {
    key: 'integration_bus',
    name: 'Bus d’intégration (ESB)',
    summary:
      'Publication fiable des événements vers les systèmes externes (webhooks signés, courtier de messages).',
    category: 'integration',
    icon: 'pi pi-sitemap',
    depends: ['base'],
  },
];

export const APP_BY_KEY = new Map(APP_CATALOG.map((app) => [app.key, app]));

/** Toutes les dépendances (transitives) d'une application, ordre d'installation. */
export function resolveDependencies(key: string): string[] {
  const ordered: string[] = [];
  const visit = (current: string, path: string[]) => {
    if (path.includes(current)) {
      throw new Error(
        `Dépendance circulaire : ${[...path, current].join(' → ')}`,
      );
    }
    const app = APP_BY_KEY.get(current);
    if (!app) throw new Error(`Application inconnue : ${current}`);
    for (const dep of app.depends) visit(dep, [...path, current]);
    if (!ordered.includes(current)) ordered.push(current);
  };
  visit(key, []);
  return ordered;
}

/** Applications qui dépendent (directement ou non) de `key`. */
export function resolveDependents(key: string): string[] {
  return APP_CATALOG.filter(
    (app) => app.key !== key && resolveDependencies(app.key).includes(key),
  ).map((app) => app.key);
}
