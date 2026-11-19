import { renderTemplate } from './template';

const envelope = {
  name: 'billing.invoice.paid',
  payload: {
    invoice_number: 'FAC/2026/00001',
    total: 1500,
    guest: { email: 'client@example.com' },
    sneaky: '{{ payload.secret }}',
    secret: 'ne-doit-pas-fuiter',
    html: '<script>alert(1)</script>',
  },
};

describe('renderTemplate', () => {
  it('remplace les références pointées', () => {
    expect(
      renderTemplate(
        'Facture {{payload.invoice_number}} payée : {{ payload.total }} pour {{payload.guest.email}}',
        envelope,
      ),
    ).toBe('Facture FAC/2026/00001 payée : 1500 pour client@example.com');
  });

  it('remplace les chemins absents par une chaîne vide', () => {
    expect(renderTemplate('[{{ payload.absent.x }}]', envelope)).toBe('[]');
  });

  it("n'exécute aucun code et ne lit pas le prototype", () => {
    expect(renderTemplate('{{ constructor.constructor }}', envelope)).toBe('');
    expect(renderTemplate('{{ payload.__proto__ }}', envelope)).toBe('');
    expect(
      renderTemplate('{{ process.exit(1) }}{{ 1 + 1 }}{{ this }}', envelope),
    ).toBe('{{ process.exit(1) }}{{ 1 + 1 }}');
  });

  it('ne réinterprète pas les valeurs injectées (passe unique)', () => {
    expect(renderTemplate('{{payload.sneaky}}', envelope)).toBe(
      '{{ payload.secret }}',
    );
  });

  it('laisse le texte brut tel quel (pas d’échappement HTML côté serveur)', () => {
    expect(renderTemplate('{{payload.html}}', envelope)).toBe(
      '<script>alert(1)</script>',
    );
  });

  it('sérialise les objets en JSON et tronque', () => {
    expect(renderTemplate('{{payload.guest}}', envelope)).toBe(
      '{"email":"client@example.com"}',
    );
    expect(renderTemplate('x'.repeat(20000), envelope)).toHaveLength(10000);
  });
});
