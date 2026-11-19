/** Catégories d'articles gérés en stock par un hôtel. */
export enum ProductCategory {
  MINIBAR = 'minibar',
  FOOD = 'food',
  BEVERAGE = 'beverage',
  AMENITIES = 'amenities',
  CLEANING = 'cleaning',
  LINEN = 'linen',
  MAINTENANCE = 'maintenance',
  OFFICE = 'office',
  OTHER = 'other',
}

/** Unités de mesure. */
export enum UnitOfMeasure {
  UNIT = 'unit',
  KG = 'kg',
  G = 'g',
  L = 'l',
  CL = 'cl',
  BOX = 'box',
  PACK = 'pack',
  CARTON = 'carton',
  BOTTLE = 'bottle',
  ROLL = 'roll',
  PAIR = 'pair',
  SET = 'set',
}

/**
 * Type d'article (comme dans Odoo) :
 * - `stockable` : quantités suivies, stock négatif interdit ;
 * - `consumable` : quantités suivies à titre indicatif, stock négatif toléré ;
 * - `service` : jamais stocké (aucun mouvement possible).
 */
export enum ProductType {
  STOCKABLE = 'stockable',
  CONSUMABLE = 'consumable',
  SERVICE = 'service',
}

/** Types d'emplacement. Seuls les emplacements `internal` portent du stock. */
export enum StockLocationType {
  INTERNAL = 'internal',
  VENDOR = 'vendor',
  CUSTOMER = 'customer',
  INVENTORY_LOSS = 'inventory_loss',
  CONSUMPTION = 'consumption',
}

export enum StockMoveState {
  DRAFT = 'draft',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

export enum InventoryCountState {
  DRAFT = 'draft',
  APPLIED = 'applied',
  CANCELLED = 'cancelled',
}

/** Codes des emplacements créés par `POST inventory/setup`. */
export const DEFAULT_LOCATION_CODES = {
  STOCK: 'STOCK',
  BAR: 'BAR',
  HOUSEKEEPING: 'ECO',
  VENDORS: 'VENDORS',
  CUSTOMERS: 'CUSTOMERS',
  LOSS: 'LOSS',
  CONSUMPTION: 'CONSO',
} as const;

export interface DefaultLocationDefinition {
  code: string;
  name: string;
  location_type: StockLocationType;
  is_default: boolean;
}

/** Emplacements par défaut d'un établissement. */
export const DEFAULT_LOCATIONS: DefaultLocationDefinition[] = [
  {
    code: DEFAULT_LOCATION_CODES.STOCK,
    name: 'Stock principal',
    location_type: StockLocationType.INTERNAL,
    is_default: true,
  },
  {
    code: DEFAULT_LOCATION_CODES.BAR,
    name: 'Bar',
    location_type: StockLocationType.INTERNAL,
    is_default: false,
  },
  {
    code: DEFAULT_LOCATION_CODES.HOUSEKEEPING,
    name: 'Économat / Housekeeping',
    location_type: StockLocationType.INTERNAL,
    is_default: false,
  },
  {
    code: DEFAULT_LOCATION_CODES.VENDORS,
    name: 'Fournisseurs',
    location_type: StockLocationType.VENDOR,
    is_default: true,
  },
  {
    code: DEFAULT_LOCATION_CODES.CUSTOMERS,
    name: 'Clients',
    location_type: StockLocationType.CUSTOMER,
    is_default: true,
  },
  {
    code: DEFAULT_LOCATION_CODES.LOSS,
    name: "Pertes d'inventaire",
    location_type: StockLocationType.INVENTORY_LOSS,
    is_default: true,
  },
  {
    code: DEFAULT_LOCATION_CODES.CONSUMPTION,
    name: 'Consommation interne',
    location_type: StockLocationType.CONSUMPTION,
    is_default: true,
  },
];
