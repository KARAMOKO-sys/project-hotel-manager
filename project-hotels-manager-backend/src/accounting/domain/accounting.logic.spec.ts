import {
  AccountBalance,
  agingBucket,
  buildBalanceSheet,
  buildGeneralLedger,
  buildIncomeStatement,
  buildReceivablesAging,
  buildTrialBalance,
  checkBalance,
  computeTotals,
  defaultAccountType,
  isLocked,
  lineShapeError,
  mirrorLines,
  round2,
  syscohadaClassOf,
  toAccountingDate,
} from './accounting.logic';
import { AccountType } from './accounting.enums';
import { DEFAULT_ACCOUNTS, DEFAULT_ACCOUNT_MAPPING } from './syscohada-chart';

const acc = (
  code: string,
  debit: number,
  credit: number,
  account_type?: AccountType,
): AccountBalance => ({
  id: `id-${code}`,
  code,
  name: `Compte ${code}`,
  account_type: account_type ?? defaultAccountType(code)!,
  syscohada_class: syscohadaClassOf(code)!,
  debit,
  credit,
});

describe('accounting.logic', () => {
  describe('round2', () => {
    it('arrondit à 2 décimales sans -0', () => {
      expect(round2(1.005)).toBe(1.01);
      expect(round2(0.1 + 0.2)).toBe(0.3);
      expect(Object.is(round2(-0.001), 0)).toBe(true);
    });
  });

  describe('plan comptable', () => {
    it('déduit la classe SYSCOHADA du premier chiffre', () => {
      expect(syscohadaClassOf('411')).toBe(4);
      expect(syscohadaClassOf('4431')).toBe(4);
      expect(syscohadaClassOf('706')).toBe(7);
      expect(syscohadaClassOf('011')).toBeNull();
      expect(syscohadaClassOf('7')).toBeNull();
      expect(syscohadaClassOf('70A')).toBeNull();
    });

    it('déduit une nature par défaut cohérente', () => {
      expect(defaultAccountType('101')).toBe(AccountType.EQUITY);
      expect(defaultAccountType('162')).toBe(AccountType.LIABILITY);
      expect(defaultAccountType('244')).toBe(AccountType.ASSET);
      expect(defaultAccountType('401')).toBe(AccountType.LIABILITY);
      expect(defaultAccountType('409')).toBe(AccountType.ASSET);
      expect(defaultAccountType('411')).toBe(AccountType.ASSET);
      expect(defaultAccountType('419')).toBe(AccountType.LIABILITY);
      expect(defaultAccountType('4452')).toBe(AccountType.ASSET);
      expect(defaultAccountType('4431')).toBe(AccountType.LIABILITY);
      expect(defaultAccountType('571')).toBe(AccountType.ASSET);
      expect(defaultAccountType('561')).toBe(AccountType.LIABILITY);
      expect(defaultAccountType('601')).toBe(AccountType.EXPENSE);
      expect(defaultAccountType('706')).toBe(AccountType.INCOME);
      expect(defaultAccountType('821')).toBe(AccountType.INCOME);
      expect(defaultAccountType('891')).toBe(AccountType.EXPENSE);
      expect(defaultAccountType('901')).toBe(AccountType.OFF_BALANCE);
    });

    it('le plan par défaut est valide, sans doublon et couvre la correspondance', () => {
      const codes = DEFAULT_ACCOUNTS.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
      expect(codes.length).toBeGreaterThanOrEqual(40);
      for (const code of codes) expect(syscohadaClassOf(code)).not.toBeNull();
      for (const code of Object.values(DEFAULT_ACCOUNT_MAPPING)) {
        expect(codes).toContain(code);
      }
    });
  });

  describe('verrouillage', () => {
    it('bloque les dates antérieures ou égales à la date de verrouillage', () => {
      const lock = new Date('2026-03-31T00:00:00Z');
      expect(isLocked(new Date('2026-03-31T18:00:00Z'), lock)).toBe(true);
      expect(isLocked(new Date('2026-01-01'), lock)).toBe(true);
      expect(isLocked(new Date('2026-04-01'), lock)).toBe(false);
      expect(isLocked(new Date('2020-01-01'), null)).toBe(false);
    });

    it('ramène une date à minuit UTC', () => {
      expect(toAccountingDate('2026-05-10T15:30:00Z').toISOString()).toBe(
        '2026-05-10T00:00:00.000Z',
      );
      expect(() => toAccountingDate('pas une date')).toThrow();
    });
  });

  describe('équilibre', () => {
    it('accepte une écriture équilibrée', () => {
      const r = checkBalance([
        { debit: 118000 },
        { credit: 100000 },
        { credit: 18000 },
      ]);
      expect(r.ok).toBe(true);
      expect(r.total_debit).toBe(118000);
      expect(r.total_credit).toBe(118000);
      expect(r.difference).toBe(0);
    });

    it('tolère les erreurs de virgule flottante (arrondi à 2 décimales)', () => {
      const r = checkBalance([{ debit: 0.1 }, { debit: 0.2 }, { credit: 0.3 }]);
      expect(r.ok).toBe(true);
    });

    it('refuse une écriture déséquilibrée', () => {
      const r = checkBalance([{ debit: 100 }, { credit: 99.99 }]);
      expect(r.ok).toBe(false);
      expect(r.difference).toBe(0.01);
      expect(r.errors.join()).toMatch(/déséquilibrée/);
    });

    it('exige au moins deux lignes', () => {
      expect(checkBalance([{ debit: 0, credit: 0 }]).ok).toBe(false);
      expect(checkBalance([]).errors[0]).toMatch(/deux lignes/);
    });

    it('chaque ligne porte exactement un montant > 0', () => {
      expect(lineShapeError({ debit: 10, credit: 5 }, 0)).toMatch(/à la fois/);
      expect(lineShapeError({ debit: 0, credit: 0 }, 1)).toMatch(/Ligne 2/);
      expect(lineShapeError({ debit: -5 }, 0)).toMatch(/positifs/);
      expect(lineShapeError({ debit: NaN }, 0)).toMatch(/invalide/);
      expect(lineShapeError({ credit: 3 }, 0)).toBeNull();
      expect(
        checkBalance([
          { debit: 10, credit: 10 },
          { debit: 10, credit: 10 },
        ]).ok,
      ).toBe(false);
    });

    it('calcule les totaux arrondis et les lignes miroir', () => {
      expect(computeTotals([{ debit: 1.005 }, { credit: 2 }])).toEqual({
        total_debit: 1.01,
        total_credit: 2,
      });
      expect(mirrorLines([{ debit: 5, credit: 0, x: 1 }])).toEqual([
        { debit: 0, credit: 5, x: 1 },
      ]);
    });
  });

  describe('balance générale', () => {
    const accounts = [
      {
        id: 'a',
        code: '411',
        name: 'Clients',
        account_type: 'asset',
        syscohada_class: 4,
      },
      {
        id: 'b',
        code: '706',
        name: 'Services',
        account_type: 'income',
        syscohada_class: 7,
      },
      {
        id: 'c',
        code: '571',
        name: 'Caisse',
        account_type: 'asset',
        syscohada_class: 5,
      },
    ];

    it('calcule ouverture, mouvements et clôture, triés par code', () => {
      const tb = buildTrialBalance(
        [
          {
            account_id: 'b',
            opening_debit: 0,
            opening_credit: 500,
            debit: 0,
            credit: 1000,
          },
          {
            account_id: 'a',
            opening_debit: 500,
            opening_credit: 0,
            debit: 1000,
            credit: 800,
          },
          {
            account_id: 'c',
            opening_debit: 0,
            opening_credit: 0,
            debit: 800,
            credit: 0,
          },
        ],
        accounts,
      );
      expect(tb.lines.map((l) => l.code)).toEqual(['411', '571', '706']);
      const clients = tb.lines[0];
      expect(clients.opening_debit).toBe(500);
      expect(clients.closing_debit).toBe(700);
      expect(tb.lines[2].closing_credit).toBe(1500);
      expect(tb.totals.period_debit).toBe(1800);
      expect(tb.totals.period_credit).toBe(1800);
      expect(tb.balanced).toBe(true);
    });

    it('ignore les comptes inconnus et sans mouvement', () => {
      const tb = buildTrialBalance(
        [
          {
            account_id: 'zzz',
            opening_debit: 1,
            opening_credit: 0,
            debit: 0,
            credit: 0,
          },
          {
            account_id: 'a',
            opening_debit: 0,
            opening_credit: 0,
            debit: 0,
            credit: 0,
          },
        ],
        accounts,
      );
      expect(tb.lines).toHaveLength(0);
    });
  });

  describe('grand livre', () => {
    it('calcule le solde progressif', () => {
      const gl = buildGeneralLedger(100, [
        { date: '2026-01-02', debit: 50, credit: 0 },
        { date: '2026-01-03', debit: 0, credit: 30 },
      ]);
      expect(gl.lines.map((l) => l.balance)).toEqual([150, 120]);
      expect(gl.closing_balance).toBe(120);
      expect(gl.total_debit).toBe(50);
      expect(gl.total_credit).toBe(30);
    });
  });

  describe('compte de résultat', () => {
    it('regroupe produits et charges par rubrique et calcule le résultat', () => {
      const is = buildIncomeStatement([
        acc('706', 0, 1000),
        acc('701', 50, 300),
        acc('601', 200, 0),
        acc('661', 400, 0),
        acc('841', 0, 25, AccountType.INCOME),
        acc('411', 1000, 0),
      ]);
      expect(is.income.total).toBe(1275);
      expect(is.expenses.total).toBe(600);
      expect(is.net_result).toBe(675);
      expect(is.income.groups.map((g) => g.key)).toEqual(['70', '84']);
      expect(is.income.groups[0].total).toBe(1250);
      expect(is.expenses.groups.map((g) => g.label)).toEqual([
        'Achats et variations de stocks',
        'Charges de personnel',
      ]);
    });
  });

  describe('bilan', () => {
    it('classe par sens de solde et intègre le résultat : bilan équilibré', () => {
      // Capital 1 000 000 en banque ; vente 118 000 TTC encaissée en caisse ;
      // achat 50 000 à crédit fournisseur ; amortissement 10 000.
      const bs = buildBalanceSheet([
        acc('101', 0, 1_000_000),
        acc('521', 1_000_000, 200_000),
        acc('244', 200_000, 0),
        acc('284', 0, 10_000),
        acc('571', 118_000, 0),
        acc('706', 0, 100_000),
        acc('4431', 0, 18_000),
        acc('601', 50_000, 0),
        acc('401', 0, 50_000),
        acc('681', 10_000, 0),
      ]);
      expect(bs.period_result).toBe(40_000);
      const assets = Object.fromEntries(
        bs.assets.sections.map((s) => [s.key, s.total]),
      );
      expect(assets.fixed_assets).toBe(190_000);
      expect(assets.cash_assets).toBe(918_000);
      const liabilities = Object.fromEntries(
        bs.liabilities.sections.map((s) => [s.key, s.total]),
      );
      expect(liabilities.equity).toBe(1_040_000);
      expect(liabilities.current_liabilities).toBe(68_000);
      expect(bs.assets.total).toBe(1_108_000);
      expect(bs.balanced).toBe(true);
    });

    it('trésorerie créditrice au passif, tiers débiteur à l’actif', () => {
      const bs = buildBalanceSheet([
        acc('521', 0, 500),
        acc('411', 500, 0),
        acc('162', 0, 0),
      ]);
      const cashLiab = bs.liabilities.sections.find(
        (s) => s.key === 'cash_liabilities',
      )!;
      expect(cashLiab.total).toBe(500);
      expect(
        bs.assets.sections.find((s) => s.key === 'receivables')!.total,
      ).toBe(500);
      expect(bs.balanced).toBe(true);
    });
  });

  describe('balance âgée', () => {
    it('classe par tranche d’ancienneté', () => {
      expect(agingBucket('2026-06-01', '2026-06-30')).toBe('current');
      expect(agingBucket('2026-05-01', '2026-06-30')).toBe('days_31_60');
      expect(agingBucket('2026-04-10', '2026-06-30')).toBe('days_61_90');
      expect(agingBucket('2026-01-01', '2026-06-30')).toBe('over_90');
    });

    it('impute les règlements FIFO sur les créances les plus anciennes', () => {
      const r = buildReceivablesAging(
        [
          {
            date: '2026-01-01',
            debit: 1000,
            credit: 0,
            partner_type: 'guest',
            partner_id: 'g1',
          },
          {
            date: '2026-06-20',
            debit: 500,
            credit: 0,
            partner_type: 'guest',
            partner_id: 'g1',
          },
          {
            date: '2026-06-25',
            debit: 0,
            credit: 700,
            partner_type: 'guest',
            partner_id: 'g1',
          },
          {
            date: '2026-06-01',
            debit: 200,
            credit: 0,
            partner_type: 'guest',
            partner_id: 'g2',
          },
          {
            date: '2026-06-02',
            debit: 0,
            credit: 200,
            partner_type: 'guest',
            partner_id: 'g2',
          },
          {
            date: '2026-06-03',
            debit: 0,
            credit: 50,
            partner_type: 'guest',
            partner_id: 'g3',
          },
        ],
        '2026-06-30',
      );
      const g1 = r.partners.find((p) => p.partner_id === 'g1')!;
      expect(g1.buckets.over_90).toBe(300);
      expect(g1.buckets.current).toBe(500);
      expect(g1.balance).toBe(800);
      expect(r.partners.find((p) => p.partner_id === 'g2')).toBeUndefined();
      const g3 = r.partners.find((p) => p.partner_id === 'g3')!;
      expect(g3.unallocated_credit).toBe(50);
      expect(g3.balance).toBe(-50);
      expect(r.totals.balance).toBe(750);
      expect(r.as_of).toBe('2026-06-30');
    });
  });
});
