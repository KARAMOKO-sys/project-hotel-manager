import {
  coerceFieldValue,
  validateCustomValues,
} from './custom-field.validator';
import { CustomFieldDefinition, CustomFieldType } from './custom-field-types';

const field = (
  key: string,
  field_type: CustomFieldType,
  extra: Partial<CustomFieldDefinition> = {},
): CustomFieldDefinition => ({ key, label: key, field_type, ...extra });

const options = [
  { value: 'vip', label: 'VIP' },
  { value: 'corp', label: 'Entreprise' },
];

describe('coerceFieldValue', () => {
  it.each([
    [CustomFieldType.TEXT, '  abc ', 'abc'],
    [CustomFieldType.INTEGER, '42', 42],
    [CustomFieldType.DECIMAL, '3.5', 3.5],
    [CustomFieldType.MONETARY, 10.456, 10.46],
    [CustomFieldType.BOOLEAN, 'true', true],
    [CustomFieldType.BOOLEAN, 0, false],
    [CustomFieldType.DATE, '2026-11-17', '2026-11-17'],
    [CustomFieldType.DATE, '2026-11-17T10:00:00Z', '2026-11-17'],
    [CustomFieldType.EMAIL, 'A@B.CO', 'a@b.co'],
    [CustomFieldType.PHONE, '+225 07 00 00 00', '+225 07 00 00 00'],
    [CustomFieldType.URL, 'https://example.com/x', 'https://example.com/x'],
  ])('convertit %s %p', (type, raw, expected) => {
    expect(coerceFieldValue(field('f', type), raw)).toEqual({
      ok: true,
      value: expected,
    });
  });

  it.each([
    [CustomFieldType.TEXT, 12],
    [CustomFieldType.TEXT, 'x'.repeat(256)],
    [CustomFieldType.LONG_TEXT, 'x'.repeat(10001)],
    [CustomFieldType.INTEGER, '4.2'],
    [CustomFieldType.INTEGER, 'abc'],
    [CustomFieldType.DECIMAL, 'NaN'],
    [CustomFieldType.BOOLEAN, 'oui'],
    [CustomFieldType.DATE, '2026-02-30'],
    [CustomFieldType.DATE, 'demain'],
    [CustomFieldType.EMAIL, 'pas-un-email'],
    [CustomFieldType.PHONE, 'abc'],
    [CustomFieldType.URL, 'javascript:alert(1)'],
    [CustomFieldType.URL, 'pas une url'],
  ])('refuse %s %p', (type, raw) => {
    expect(coerceFieldValue(field('f', type), raw).ok).toBe(false);
  });

  it('vérifie l’appartenance aux sélections', () => {
    const single = field('s', CustomFieldType.SELECTION, { options });
    const multi = field('m', CustomFieldType.MULTI_SELECTION, { options });
    expect(coerceFieldValue(single, 'vip')).toEqual({ ok: true, value: 'vip' });
    expect(coerceFieldValue(single, 'autre').ok).toBe(false);
    expect(coerceFieldValue(multi, ['vip', 'vip', 'corp'])).toEqual({
      ok: true,
      value: ['vip', 'corp'],
    });
    expect(coerceFieldValue(multi, ['vip', 'x']).ok).toBe(false);
    expect(coerceFieldValue(multi, 'vip').ok).toBe(false);
  });

  it('traite les valeurs vides comme un effacement', () => {
    expect(coerceFieldValue(field('f', CustomFieldType.INTEGER), '')).toEqual({
      ok: true,
      value: null,
    });
  });
});

describe('validateCustomValues', () => {
  const fields = [
    field('segment', CustomFieldType.SELECTION, { options, required: true }),
    field('nb_enfants', CustomFieldType.INTEGER, { default_value: 0 }),
    field('ancien', CustomFieldType.TEXT, { is_active: false }),
  ];

  it('refuse les clés inconnues et inactives', () => {
    const result = validateCustomValues(
      fields,
      JSON.parse(
        '{"segment":"vip","inconnu":1,"ancien":"x","__proto__":{"polluted":true}}',
      ),
    );
    expect(result.errors.map((e) => e.key).sort()).toEqual([
      '__proto__',
      'ancien',
      'inconnu',
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('contrôle les champs obligatoires sur le résultat fusionné', () => {
    expect(validateCustomValues(fields, { nb_enfants: 2 }).errors[0].key).toBe(
      'segment',
    );
    const merged = validateCustomValues(
      fields,
      { nb_enfants: '3' },
      { existing: { segment: 'corp' } },
    );
    expect(merged.errors).toEqual([]);
    expect(merged.values).toEqual({ segment: 'corp', nb_enfants: 3 });
    expect(
      validateCustomValues(
        fields,
        { segment: null },
        { existing: { segment: 'vip' } },
      ).errors[0].key,
    ).toBe('segment');
  });

  it('applique les valeurs par défaut à la première saisie', () => {
    const result = validateCustomValues(
      fields,
      { segment: 'vip' },
      { applyDefaults: true },
    );
    expect(result.values).toEqual({ segment: 'vip', nb_enfants: 0 });
  });

  it('conserve les valeurs existantes et efface avec null', () => {
    const result = validateCustomValues(
      fields,
      { nb_enfants: null },
      { existing: { segment: 'vip', nb_enfants: 2, ancien: 'gardé' } },
    );
    expect(result.values).toEqual({ segment: 'vip', ancien: 'gardé' });
  });

  it('refuse une entrée qui n’est pas un objet', () => {
    expect(validateCustomValues(fields, ['x']).errors[0].key).toBe('*');
  });
});
