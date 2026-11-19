/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { StockLowListener } from './stock-low.listener';
import { DomainEvents } from '../../platform/events/domain-events';

describe('StockLowListener', () => {
  let orders: any;
  let inventory: any;
  let settings: any;
  let apps: any;
  let tenantScope: any;
  let listener: StockLowListener;

  const event = (overrides: any = {}) => ({
    id: 'e1',
    name: DomainEvents.STOCK_LOW,
    occurred_at: new Date(),
    property_id: 'prop-1',
    payload: {
      product_id: 'prod-1',
      product_name: 'Kit accueil',
      property_id: 'prop-1',
      quantity_available: 4,
      reorder_min: 5,
      reorder_max: 20,
      preferred_vendor_id: 'vendor-1',
      ...overrides,
    },
  });

  beforeEach(() => {
    orders = {
      addReorderLine: jest.fn().mockResolvedValue({
        outcome: 'added_line',
        order: { number: 'BC/1' },
      }),
    };
    inventory = {
      findProduct: jest
        .fn()
        .mockResolvedValue({ is_active: true, cost_price: 1250 }),
    };
    settings = { get: jest.fn().mockResolvedValue({ auto_reorder: true }) };
    apps = { isInstalled: jest.fn().mockResolvedValue(true) };
    tenantScope = {
      getOrganizationIdForProperty: jest.fn().mockResolvedValue('org-1'),
    };
    listener = new StockLowListener(
      orders,
      inventory,
      settings,
      apps,
      tenantScope,
    );
  });

  it('ajoute reorder_max − disponible au brouillon du fournisseur préféré', async () => {
    await listener.handle(event());
    expect(apps.isInstalled).toHaveBeenCalledWith('org-1', 'purchase');
    expect(orders.addReorderLine).toHaveBeenCalledWith(
      expect.objectContaining({ product_id: 'prod-1' }),
      'vendor-1',
      16,
      1250,
    );
  });

  it('ne fait rien si Achats n’est pas installé', async () => {
    apps.isInstalled.mockResolvedValue(false);
    await listener.handle(event());
    expect(orders.addReorderLine).not.toHaveBeenCalled();
  });

  it('ne fait rien sans fournisseur préféré', async () => {
    await listener.handle(event({ preferred_vendor_id: null }));
    expect(orders.addReorderLine).not.toHaveBeenCalled();
  });

  it('ne fait rien si le réapprovisionnement automatique est désactivé', async () => {
    settings.get.mockResolvedValue({ auto_reorder: false });
    await listener.handle(event());
    expect(orders.addReorderLine).not.toHaveBeenCalled();
  });

  it('absorbe les erreurs (ne casse jamais l’émetteur)', async () => {
    orders.addReorderLine.mockRejectedValue(new Error('boom'));
    await expect(listener.handle(event() as any)).resolves.toBeUndefined();
  });
});
