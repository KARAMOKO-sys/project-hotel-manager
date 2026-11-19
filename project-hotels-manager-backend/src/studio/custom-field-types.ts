/** Types de champs personnalisés pris en charge par le Studio. */
export enum CustomFieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  SELECTION = 'selection',
  MULTI_SELECTION = 'multi_selection',
  MONETARY = 'monetary',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
}

/** Option d'un champ de sélection. */
export interface CustomFieldOption {
  value: string;
  label: string;
}

/** Définition minimale utilisée par le validateur (pur). */
export interface CustomFieldDefinition {
  key: string;
  label: string;
  field_type: CustomFieldType;
  options?: CustomFieldOption[];
  required?: boolean;
  default_value?: unknown;
  is_active?: boolean;
}

/** Format d'une clé de champ personnalisé. */
export const CUSTOM_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,40}$/;

/**
 * Noms toujours réservés (champs techniques communs à toutes les fiches),
 * complétés par les champs du schéma Mongoose du modèle visé.
 */
export const BASE_RESERVED_KEYS: readonly string[] = [
  'id',
  '_id',
  '__v',
  'property_id',
  'organization_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'is_deleted',
  'created_by',
  'updated_by',
  'status',
  'state',
  'name',
  'custom_fields',
  'values',
];

/** Longueurs maximales par type textuel. */
export const MAX_LENGTHS: Partial<Record<CustomFieldType, number>> = {
  [CustomFieldType.TEXT]: 255,
  [CustomFieldType.LONG_TEXT]: 10000,
  [CustomFieldType.EMAIL]: 320,
  [CustomFieldType.PHONE]: 30,
  [CustomFieldType.URL]: 2048,
};

/** Types qui exigent une liste d'options. */
export const SELECTION_TYPES: readonly CustomFieldType[] = [
  CustomFieldType.SELECTION,
  CustomFieldType.MULTI_SELECTION,
];
