/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument -- mocks Mongoose typés `any` */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { JournalEntryService } from './journal-entry.service';
import { JournalEntryState } from '../schemas/journal-entry.entity';
import { DomainEvents } from '../../platform/events/domain-events';

/** Requête Mongoose simulée (chaînable, résolue par `exec`). */
const q = (value: unknown) => {
  const chain: any = {
    lean: jest.fn(() => chain),
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    exec: jest.fn().mockResolvedValue(value),
  };
  return chain;
};

describe('JournalEntryService', () => {
  const propertyId = new Types.ObjectId();
  const journalId = new Types.ObjectId();
  const cashId = new Types.ObjectId();
  const revenueId = new Types.ObjectId();

  let entryModel: any;
  let accountModel: any;
  let journalModel: any;
  let settingsModel: any;
  let sequences: any;
  let events: any;
  let service: JournalEntryService;
  let settings: any;

  const journal = {
    _id: journalId,
    property_id: propertyId,
    code: 'CAI',
    is_active: true,
  };
  const accounts = [
    { _id: cashId, property_id: propertyId, code: '571', is_active: true },
    { _id: revenueId, property_id: propertyId, code: '701', is_active: true },
  ];

  const makeEntry = (overrides: Record<string, unknown> = {}): any => ({
    _id: new Types.ObjectId(),
    property_id: propertyId,
    journal_id: journalId,
    journal_code: 'CAI',
    date: new Date('2026-05-10T00:00:00Z'),
    state: JournalEntryState.DRAFT,
    updated_at: new Date('2026-05-10T08:00:00Z'),
    lines: [
      { account_id: cashId, debit: 1000, credit: 0 },
      { account_id: revenueId, debit: 0, credit: 1000 },
    ],
    ...overrides,
  });

  beforeEach(() => {
    settings = null;
    const ModelMock: any = function () {};
    entryModel = ModelMock;
    entryModel.findById = jest.fn();
    entryModel.findOne = jest.fn(() => q(null));
    entryModel.findOneAndUpdate = jest.fn();
    entryModel.findByIdAndUpdate = jest.fn();
    entryModel.create = jest.fn();
    entryModel.deleteOne = jest.fn(() => q({}));
    entryModel.updateOne = jest.fn(() => q({}));
    accountModel = {
      find: jest.fn(() => q(accounts)),
    };
    journalModel = { findOne: jest.fn(() => q(journal)) };
    settingsModel = { findOne: jest.fn(() => q(settings)) };
    sequences = { next: jest.fn().mockResolvedValue('CAI/2026/00001') };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new JournalEntryService(
      entryModel,
      accountModel,
      journalModel,
      settingsModel,
      sequences,
      events,
    );
  });

  describe('post', () => {
    it('valide un brouillon équilibré, attribue le numéro et publie l’événement', async () => {
      const entry = makeEntry();
      entryModel.findById.mockReturnValue(q(entry));
      entryModel.findOneAndUpdate.mockReturnValue(
        q({ ...entry, state: JournalEntryState.POSTED }),
      );
      const posted = {
        ...entry,
        state: JournalEntryState.POSTED,
        number: 'CAI/2026/00001',
      };
      entryModel.findByIdAndUpdate.mockReturnValue(q(posted));

      const result = await service.post(
        String(entry._id),
        String(new Types.ObjectId()),
      );

      expect(result.number).toBe('CAI/2026/00001');
      // Transition atomique avec précondition brouillon + version lue.
      const [filter, update] = entryModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({
        _id: entry._id,
        state: 'draft',
        updated_at: entry.updated_at,
      });
      expect(update.$set).toMatchObject({
        state: 'posted',
        total_debit: 1000,
        total_credit: 1000,
      });
      expect(sequences.next).toHaveBeenCalledWith('accounting.entry.CAI', {
        prefix: 'CAI',
        scopeId: String(propertyId),
        date: entry.date,
      });
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.JOURNAL_ENTRY_POSTED,
        expect.objectContaining({ property_id: String(propertyId) }),
      );
    });

    it('refuse une écriture déséquilibrée sans numéroter', async () => {
      entryModel.findById.mockReturnValue(
        q(
          makeEntry({
            lines: [
              { account_id: cashId, debit: 1000, credit: 0 },
              { account_id: revenueId, debit: 0, credit: 900 },
            ],
          }),
        ),
      );
      await expect(service.post(String(new Types.ObjectId()))).rejects.toThrow(
        BadRequestException,
      );
      expect(entryModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(sequences.next).not.toHaveBeenCalled();
    });

    it('refuse une écriture datée dans une période verrouillée', async () => {
      settings = { lock_date: new Date('2026-05-31T00:00:00Z') };
      entryModel.findById.mockReturnValue(q(makeEntry()));
      await expect(service.post(String(new Types.ObjectId()))).rejects.toThrow(
        /verrouillée/,
      );
      expect(sequences.next).not.toHaveBeenCalled();
    });

    it('refuse de valider deux fois (écriture déjà validée)', async () => {
      entryModel.findById.mockReturnValue(
        q(makeEntry({ state: JournalEntryState.POSTED })),
      );
      await expect(service.post(String(new Types.ObjectId()))).rejects.toThrow(
        ConflictException,
      );
    });

    it('conflit si l’écriture a changé entre la lecture et la validation', async () => {
      entryModel.findById.mockReturnValue(q(makeEntry()));
      entryModel.findOneAndUpdate.mockReturnValue(q(null));
      await expect(service.post(String(new Types.ObjectId()))).rejects.toThrow(
        ConflictException,
      );
      expect(sequences.next).not.toHaveBeenCalled();
    });

    it('refuse un compte inactif', async () => {
      accountModel.find.mockReturnValue(
        q([accounts[0], { ...accounts[1], is_active: false }]),
      );
      entryModel.findById.mockReturnValue(q(makeEntry()));
      await expect(service.post(String(new Types.ObjectId()))).rejects.toThrow(
        /inactifs/,
      );
    });
  });

  describe('immutabilité', () => {
    it('refuse la modification d’une écriture validée', async () => {
      entryModel.findById.mockReturnValue(
        q(makeEntry({ state: JournalEntryState.POSTED })),
      );
      await expect(
        service.update(String(new Types.ObjectId()), { reference: 'X' }),
      ).rejects.toThrow(/immuable/);
      expect(entryModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('refuse l’annulation d’une écriture validée (précondition brouillon)', async () => {
      entryModel.findById.mockReturnValue(
        q(makeEntry({ state: JournalEntryState.POSTED })),
      );
      entryModel.findOneAndUpdate.mockReturnValue(q(null));
      await expect(
        service.cancel(String(new Types.ObjectId())),
      ).rejects.toThrow(ConflictException);
      expect(entryModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
        state: 'draft',
      });
    });

    it('refuse la modification d’un brouillon en période verrouillée', async () => {
      settings = { lock_date: new Date('2026-12-31') };
      entryModel.findById.mockReturnValue(q(makeEntry()));
      await expect(
        service.update(String(new Types.ObjectId()), { reference: 'X' }),
      ).rejects.toThrow(/verrouillée/);
    });
  });

  describe('create', () => {
    it('calcule les totaux côté serveur et refuse une ligne débit + crédit', async () => {
      await expect(
        service.create({
          property_id: String(propertyId),
          journal_id: String(journalId),
          date: '2026-05-10',
          lines: [{ account_id: String(cashId), debit: 10, credit: 10 }],
        }),
      ).rejects.toThrow(/à la fois/);
    });
  });

  describe('reverse', () => {
    it('refuse une écriture déjà contre-passée', async () => {
      entryModel.findById.mockReturnValue(
        q(
          makeEntry({
            state: JournalEntryState.POSTED,
            reversed_entry_id: new Types.ObjectId(),
          }),
        ),
      );
      await expect(
        service.reverse(String(new Types.ObjectId())),
      ).rejects.toThrow(/déjà contre-passée/);
    });

    it('refuse une écriture datée dans une période verrouillée', async () => {
      settings = { lock_date: new Date('2026-05-31') };
      entryModel.findById.mockReturnValue(
        q(
          makeEntry({
            state: JournalEntryState.POSTED,
            number: 'CAI/2026/00001',
          }),
        ),
      );
      await expect(
        service.reverse(String(new Types.ObjectId())),
      ).rejects.toThrow(/verrouillée/);
    });

    it('crée et valide l’écriture miroir puis publie accounting.entry.reversed', async () => {
      const original = makeEntry({
        state: JournalEntryState.POSTED,
        number: 'CAI/2026/00001',
      });
      let reversalDraft: any;
      entryModel.create.mockImplementation((doc: any) => {
        reversalDraft = { ...doc, updated_at: new Date() };
        return Promise.resolve(reversalDraft);
      });
      entryModel.findById.mockImplementation((id: any) =>
        q(String(id) === String(original._id) ? original : reversalDraft),
      );
      entryModel.findOneAndUpdate.mockImplementation(() => q({ ok: true }));
      entryModel.findByIdAndUpdate.mockImplementation((id: any) =>
        q({
          ...reversalDraft,
          _id: id,
          state: 'posted',
          number: 'CAI/2026/00002',
        }),
      );

      const { reversal } = await service.reverse(String(original._id), {
        reason: 'Erreur',
      });

      // Lien posé atomiquement sur l'original (précondition « non contre-passée »).
      expect(entryModel.findOneAndUpdate.mock.calls[0][0]).toMatchObject({
        _id: original._id,
        state: 'posted',
        reversed_entry_id: null,
      });
      expect(reversalDraft.reversal_of_id).toEqual(original._id);
      expect(reversalDraft.lines[0]).toMatchObject({ debit: 0, credit: 1000 });
      expect(reversalDraft.lines[1]).toMatchObject({ debit: 1000, credit: 0 });
      expect(reversal.number).toBe('CAI/2026/00002');
      expect(events.publish).toHaveBeenCalledWith(
        DomainEvents.JOURNAL_ENTRY_REVERSED,
        expect.anything(),
      );
    });
  });

  describe('createAndPost (idempotence)', () => {
    const input = () => ({
      property_id: String(propertyId),
      journal_code: 'CAI',
      date: new Date('2026-05-10'),
      lines: [
        { account_code: '571', debit: 1000, credit: 0 },
        { account_code: '701', debit: 0, credit: 1000 },
      ],
      source: {
        model: 'PosTransaction',
        id: 'tx1',
        event: 'pos.transaction.completed',
      },
    });

    it('renvoie l’écriture existante pour une source déjà traitée', async () => {
      const existing = makeEntry({ state: JournalEntryState.POSTED });
      entryModel.findOne.mockReturnValue(q(existing));
      const result = await service.createAndPost(input());
      expect(result).toEqual({ entry: existing, created: false });
      expect(entryModel.create).not.toHaveBeenCalled();
    });

    it('gère la course sur l’index unique de la source', async () => {
      const existing = makeEntry({ state: JournalEntryState.POSTED });
      entryModel.findOne
        .mockReturnValueOnce(q(null))
        .mockReturnValueOnce(q(existing));
      entryModel.create.mockRejectedValue(
        Object.assign(new Error('dup'), { code: 11000 }),
      );
      const result = await service.createAndPost(input());
      expect(result.created).toBe(false);
      expect(result.entry).toBe(existing);
    });

    it('crée puis valide une nouvelle écriture', async () => {
      const created = makeEntry();
      entryModel.create.mockResolvedValue(created);
      entryModel.findById.mockReturnValue(q(created));
      entryModel.findOneAndUpdate.mockReturnValue(
        q({ ...created, state: 'posted' }),
      );
      entryModel.findByIdAndUpdate.mockReturnValue(
        q({ ...created, state: 'posted', number: 'CAI/2026/00001' }),
      );
      const result = await service.createAndPost(input());
      expect(result.created).toBe(true);
      expect(entryModel.create.mock.calls[0][0]).toMatchObject({
        source: input().source,
        total_debit: 1000,
        total_credit: 1000,
        state: 'draft',
      });
    });

    it('échoue si un compte du plan est absent', async () => {
      accountModel.find.mockReturnValue(q([accounts[0]]));
      await expect(service.createAndPost(input())).rejects.toThrow(/701/);
    });
  });
});
