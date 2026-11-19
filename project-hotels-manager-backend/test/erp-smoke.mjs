/**
 * Test de fumée de bout en bout des applications ERP, contre une API démarrée
 * et une base initialisée par `npm run seed`.
 *
 *   API_URL=http://localhost:3005/api ADMIN_EMAIL=… ADMIN_PASSWORD=… node test/erp-smoke.mjs
 *
 * Scénario : séjour client (réservation → arrivée → départ) puis facture et
 * paiement, achat fournisseur (commande → réception → facture), règle
 * d'automatisation, webhook ESB signé, désinstallation d'une application.
 * À lancer sur une base de test : le scénario crée des données.
 */
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';

const API = process.env.API_URL ?? 'http://localhost:3005/api';
const results = [];
let token;

async function call(method, path, body, { expect = [200, 201, 202] } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  if (!expect.includes(res.status)) {
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 300)}`);
  }
  return data;
}

const list = (r) => (Array.isArray(r) ? r : (r?.data ?? []));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`  OK   ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`  ÉCHEC ${name} — ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  // Récepteur de webhooks local pour l'ESB.
  const received = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      received.push({ headers: req.headers, raw });
      res.writeHead(200).end('ok');
    });
  }).listen(0);
  const hookPort = server.address().port;

  console.log(`API : ${API}`);
  const login = await call('POST', '/auth/login', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    user_type: 'super_admin',
  });
  token = login.access_token ?? login.tokens?.access_token;
  assert(token, 'pas de jeton');

  const org = list(await call('GET', '/organizations?limit=10')).find((o) => o.code === 'PLEASANTSTAY-DEMO');
  const property = list(await call('GET', '/properties?limit=10')).find((p) => p.code === 'PS-ABJ');
  const orgId = org._id;
  const propertyId = property._id;
  const roomType = list(await call('GET', `/room-types?limit=10`)).find((t) => t.code === 'STD');

  await check('Magasin d’applications', async () => {
    const apps = await call('GET', `/apps?organization_id=${orgId}`);
    const installed = apps.filter((a) => a.installed).length;
    assert(installed >= 21, `${installed} installées`);
    return `${apps.length} applications, ${installed} installées`;
  });

  let ruleId;
  await check('Règle d’automatisation (note sur nouvelle réservation)', async () => {
    const rule = await call('POST', '/automation/rules', {
      property_id: propertyId,
      name: 'Note de bienvenue',
      trigger_event: 'hotel.reservation.created',
      conditions: [{ path: 'payload.adults', operator: 'gte', value: 2 }],
      actions: [{ type: 'post_note', params: { body: 'Préparer l’accueil pour {{ payload.adults }} adultes.' } }],
    });
    ruleId = rule._id;
    return `règle ${ruleId}`;
  });

  let secret;
  await check('Point de sortie ESB (webhook signé)', async () => {
    const endpoint = await call('POST', '/integration/endpoints', {
      organization_id: orgId,
      name: 'Récepteur de test',
      kind: 'webhook',
      url: `http://127.0.0.1:${hookPort}/hook`,
      event_patterns: ['billing.*', 'hotel.reservation.*'],
    });
    secret = endpoint.secret;
    assert(secret, 'secret non renvoyé à la création');
    return `endpoint ${endpoint._id ?? endpoint.id}`;
  });

  const guest = await call('POST', '/guests', {
    email: `client.${Date.now()}@exemple.ci`,
    password: 'Client2026!',
    first_name: 'Awa',
    last_name: 'Koné',
  });
  const guestId = guest._id;

  let reservation;
  await check('Séjour : réservation, arrivée, départ', async () => {
    const day = 24 * 3600 * 1000;
    reservation = await call('POST', '/reservations', {
      property_id: propertyId,
      guest_id: guestId,
      room_type_id: roomType._id,
      check_in: new Date(Date.now() + day).toISOString(),
      check_out: new Date(Date.now() + 3 * day).toISOString(),
      adults: 2,
      total_amount: { amount: 90000, currency: 'XOF' },
    });
    await call('PATCH', `/reservations/${reservation._id}/confirm`);
    await call('PATCH', `/reservations/${reservation._id}/check-in`);
    await call('PATCH', `/reservations/${reservation._id}/check-out`);
    return reservation.confirmation_code;
  });
  await sleep(1500);

  await check('Chatter : suivi automatique + note de la règle', async () => {
    const thread = await call('GET', `/activity/Reservation/${reservation._id}/thread`);
    const messages = thread.messages ?? thread.data ?? [];
    const tracking = messages.filter((m) => m.message_type === 'tracking').length;
    const note = messages.find((m) => /Préparer l’accueil pour 2 adultes/.test(m.body ?? ''));
    assert(tracking >= 3, `${tracking} messages de suivi`);
    assert(note, 'note de la règle absente');
    return `${tracking} suivis, note automatique présente`;
  });

  await check('Fidélité : points gagnés au départ', async () => {
    const accounts = list(await call('GET', `/loyalty/accounts?property_id=${propertyId}&limit=50`));
    const account = accounts.find((a) => String(a.guest_id) === String(guestId));
    assert(account && account.balance > 0, 'aucun point');
    return `${account.balance} points (palier ${account.tier})`;
  });

  await check('Stock : kit d’accueil consommé au départ', async () => {
    const moves = list(await call('GET', `/stock-moves?property_id=${propertyId}&limit=50`));
    const move = moves.find((m) => String(m.origin?.id ?? '') === String(reservation._id) || /checkout/.test(m.origin_key ?? m.idempotency_key ?? ''));
    assert(move, 'aucun mouvement lié au départ');
    return `mouvement ${move.reference} (${move.state})`;
  });

  let invoice;
  await check('Facture → écriture de vente automatique', async () => {
    invoice = await call('POST', '/invoices', {
      property_id: propertyId,
      guest_id: guestId,
      reservation_id: reservation._id,
      subtotal: 90000,
      tax_amount: 16200,
      total_amount: 106200,
      currency: 'XOF',
    });
    await sleep(800);
    const entries = list(await call('GET', `/accounting/journal-entries?property_id=${propertyId}&limit=50`));
    const entry = entries.find((e) => e.source?.id === String(invoice._id));
    assert(entry, 'aucune écriture pour la facture');
    assert(entry.state === 'posted', `état ${entry.state}`);
    return `${entry.number} : débit ${entry.total_debit} = crédit ${entry.total_credit}`;
  });

  await check('Paiement mobile money → écriture de trésorerie', async () => {
    const payment = await call('POST', '/payments', {
      property_id: propertyId,
      invoice_id: invoice._id,
      guest_id: guestId,
      amount: { amount: 106200, currency: 'XOF' },
      method: 'mobile_money',
    });
    await sleep(800);
    const entries = list(await call('GET', `/accounting/journal-entries?property_id=${propertyId}&limit=50`));
    const entry = entries.find((e) => e.source?.id === String(payment._id));
    assert(entry && entry.state === 'posted', 'aucune écriture postée pour le paiement');
    return entry.number;
  });

  await check('Achats : commande → réception → facture fournisseur comptabilisée', async () => {
    const vendor = list(await call('GET', `/vendors?property_id=${propertyId}`))[0];
    const product = list(await call('GET', `/products?property_id=${propertyId}&limit=50`)).find((p) => p.sku === 'EAU-150');
    const po = await call('POST', '/purchase-orders', {
      property_id: propertyId,
      vendor_id: vendor._id,
      lines: [{ product_id: product._id, description: product.name, quantity: 120, unit_price: 300, tax_rate: 18 }],
    });
    await call('POST', `/purchase-orders/${po._id}/confirm`);
    await call('POST', `/purchase-orders/${po._id}/receive`, { lines: [{ line_index: 0, quantity: 120 }] });
    const bill = await call('POST', `/purchase-orders/${po._id}/bill`, {});
    await call('POST', `/vendor-bills/${bill._id}/post`);
    await sleep(800);
    const levels = await call('GET', `/inventory/reports/stock-levels?property_id=${propertyId}&product_id=${product._id}`);
    const qty = list(levels).reduce((s, l) => s + (l.quantity ?? 0), 0);
    const entries = list(await call('GET', `/accounting/journal-entries?property_id=${propertyId}&limit=50`));
    const entry = entries.find((e) => e.source?.id === String(bill._id));
    assert(qty >= 120, `stock ${qty}`);
    assert(entry && entry.state === 'posted', 'facture fournisseur non comptabilisée');
    return `${po.number} reçu, stock ${qty}, écriture ${entry.number}`;
  });

  await check('Balance comptable équilibrée', async () => {
    const tb = await call('GET', `/accounting/reports/trial-balance?property_id=${propertyId}`);
    const d = tb.totals.period_debit;
    const c = tb.totals.period_credit;
    assert(tb.balanced === true && d > 0 && Math.abs(d - c) < 0.01, `débit ${d} / crédit ${c}`);
    return `débit ${d} = crédit ${c}`;
  });

  await check('ESB : webhooks livrés et signature HMAC valide', async () => {
    await call('POST', `/integration/outbox/dispatch?organization_id=${orgId}`);
    await sleep(1500);
    assert(received.length > 0, 'aucun webhook reçu');
    const first = received[0];
    const ts = first.headers['x-pleasantstay-timestamp'];
    const expected = 'v1=' + createHmac('sha256', secret).update(`${ts}.${first.raw}`).digest('hex');
    assert(first.headers['x-pleasantstay-signature'] === expected, 'signature invalide');
    return `${received.length} webhooks (${[...new Set(received.map((r) => r.headers['x-pleasantstay-event']))].join(', ')})`;
  });

  await check('Désinstallation : l’application Fidélité devient inaccessible', async () => {
    await call('POST', `/apps/loyalty/uninstall?organization_id=${orgId}`);
    await call('GET', `/loyalty/programs?property_id=${propertyId}`, undefined, { expect: [403] });
    await call('POST', `/apps/loyalty/install?organization_id=${orgId}`);
    await call('GET', `/loyalty/programs?property_id=${propertyId}`);
    return '403 après désinstallation, accès rétabli après réinstallation';
  });

  await check('Dépendances : impossible de désinstaller Stock tant qu’Achats est installé', async () => {
    await call('POST', `/apps/inventory/uninstall?organization_id=${orgId}`, undefined, { expect: [409] });
    return '409 attendu';
  });

  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
