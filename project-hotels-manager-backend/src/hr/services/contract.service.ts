import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, QueryFilter } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { SequenceService } from '../../platform/sequences/sequence.service';
import {
  CONTRACT_TYPES_WITH_END,
  ContractState,
  ContractType,
  EmploymentContract,
} from '../schemas/employment-contract.entity';
import {
  ContractQueryDto,
  CreateContractDto,
  TerminateContractDto,
  UpdateContractDto,
} from '../dto/contract.dto';
import { HrStaffService } from './hr-staff.service';
import {
  addDays,
  escapeRegex,
  isDuplicateKeyError,
  toDay,
  toObjectId,
} from '../hr.utils';

/** Vérifie la cohérence type de contrat / dates. */
export function assertContractDates(
  type: ContractType,
  start: Date,
  end?: Date | null,
): void {
  if (CONTRACT_TYPES_WITH_END.includes(type) && !end) {
    throw new BadRequestException(
      'La date de fin est obligatoire pour un CDD ou un stage',
    );
  }
  if (end && toDay(end).getTime() < toDay(start).getTime()) {
    throw new BadRequestException(
      'La date de fin doit être postérieure à la date de début',
    );
  }
}

/**
 * Contrats de travail : brouillon → en cours → expiré / résilié.
 * Un seul contrat en cours par employé (index unique partiel + contrôle).
 */
@Injectable()
export class ContractService extends BaseCrudService<
  EmploymentContract,
  CreateContractDto,
  UpdateContractDto
> {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @InjectModel(EmploymentContract.name)
    protected readonly contractModel: Model<EmploymentContract>,
    private readonly staff: HrStaffService,
    private readonly sequences: SequenceService,
  ) {
    super(contractModel, EmploymentContract.name);
  }

  async create(dto: CreateContractDto): Promise<EmploymentContract> {
    const propertyId = toObjectId(dto.property_id, 'property_id');
    await this.staff.get(dto.staff_id, propertyId);
    const start = toDay(dto.start_date);
    const end = dto.end_date ? toDay(dto.end_date) : undefined;
    assertContractDates(dto.contract_type, start, end);
    const reference = await this.sequences.next('hr.contract', {
      prefix: 'CT',
      scopeId: String(propertyId),
    });
    return super.create({
      ...dto,
      start_date: start,
      end_date: end,
      reference,
      state: ContractState.DRAFT,
    } as unknown as CreateContractDto);
  }

  /** Seules les notes restent modifiables après le démarrage. */
  async update(
    id: string,
    dto: UpdateContractDto,
  ): Promise<EmploymentContract> {
    const current = await this.findOne(id);
    const keys = Object.keys(dto).filter(
      (k) => (dto as Record<string, unknown>)[k] !== undefined,
    );
    if (
      current.state !== ContractState.DRAFT &&
      keys.some((k) => k !== 'notes' && k !== 'job_title')
    ) {
      throw new BadRequestException(
        'Seul un contrat en brouillon peut être modifié',
      );
    }
    const type = dto.contract_type ?? current.contract_type;
    const start = dto.start_date ? toDay(dto.start_date) : current.start_date;
    const end = dto.end_date ? toDay(dto.end_date) : current.end_date;
    assertContractDates(type, start, end);
    return super.update(id, {
      ...dto,
      ...(dto.start_date ? { start_date: start } : {}),
      ...(dto.end_date ? { end_date: end } : {}),
    } as unknown as UpdateContractDto);
  }

  async findAll(
    query: ContractQueryDto,
  ): Promise<PaginatedResult<EmploymentContract>> {
    const filter: QueryFilter<EmploymentContract> = {};
    if (query.property_id)
      filter.property_id = toObjectId(query.property_id, 'property_id');
    if (query.staff_id)
      filter.staff_id = toObjectId(query.staff_id, 'staff_id');
    if (query.state) filter.state = query.state;
    if (query.contract_type) filter.contract_type = query.contract_type;
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ reference: regex }, { job_title: regex }];
    }
    return super.findAll(query, filter);
  }

  /** Démarre un contrat brouillon (refusé si un autre est en cours). */
  async start(id: string): Promise<EmploymentContract> {
    const current = await this.findOne(id);
    if (current.state !== ContractState.DRAFT) {
      throw new BadRequestException(
        'Seul un contrat en brouillon peut être démarré',
      );
    }
    if (current.end_date && toDay(current.end_date) < toDay(new Date())) {
      throw new BadRequestException('Ce contrat est déjà arrivé à échéance');
    }
    await this.staff.get(current.staff_id, current.property_id);
    const running = await this.contractModel
      .exists({
        staff_id: current.staff_id,
        state: ContractState.RUNNING,
        is_deleted: { $ne: true },
        _id: { $ne: current._id },
      })
      .exec();
    if (running) {
      throw new ConflictException("L'employé a déjà un contrat en cours");
    }
    try {
      const updated = await this.contractModel
        .findOneAndUpdate(
          { _id: current._id, state: ContractState.DRAFT },
          { $set: { state: ContractState.RUNNING } },
          { returnDocument: 'after' },
        )
        .exec();
      if (!updated) {
        throw new ConflictException("Le contrat a changé d'état ; réessayez");
      }
      return updated;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException("L'employé a déjà un contrat en cours");
      }
      throw error;
    }
  }

  /** Résilie un contrat en cours. */
  async terminate(
    id: string,
    dto: TerminateContractDto,
  ): Promise<EmploymentContract> {
    const current = await this.findOne(id);
    const endDate = dto.end_date ? toDay(dto.end_date) : toDay(new Date());
    if (endDate < toDay(current.start_date)) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }
    const updated = await this.contractModel
      .findOneAndUpdate(
        { _id: current._id, state: ContractState.RUNNING },
        {
          $set: {
            state: ContractState.TERMINATED,
            end_date: endDate,
            terminated_at: new Date(),
            termination_reason: dto.reason,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!updated) {
      throw new BadRequestException(
        'Seul un contrat en cours peut être résilié',
      );
    }
    return updated;
  }

  /** Un brouillon peut être supprimé ; un contrat signé est conservé. */
  async remove(id: string): Promise<EmploymentContract> {
    const current = await this.findOne(id);
    if (current.state !== ContractState.DRAFT) {
      throw new BadRequestException(
        'Seul un contrat en brouillon peut être supprimé',
      );
    }
    return super.remove(id);
  }

  /** Contrats en cours se terminant dans les `days` prochains jours. */
  async findExpiring(
    propertyId: string | undefined,
    days = 30,
    today: Date = new Date(),
  ): Promise<EmploymentContract[]> {
    const from = toDay(today);
    const to = addDays(from, days);
    const filter: QueryFilter<EmploymentContract> = {
      is_deleted: { $ne: true },
      state: ContractState.RUNNING,
      end_date: { $gte: from, $lte: to },
    };
    if (propertyId) filter.property_id = toObjectId(propertyId, 'property_id');
    return await this.contractModel
      .find(filter)
      .sort({ end_date: 1 })
      .populate('staff_id', 'position employee_code user_id')
      .lean()
      .exec();
  }

  /** Passe à « expiré » les contrats en cours dont la date de fin est passée. */
  async expireOverdue(today: Date = new Date()): Promise<number> {
    const result = await this.contractModel
      .updateMany(
        {
          state: ContractState.RUNNING,
          is_deleted: { $ne: true },
          end_date: { $lt: toDay(today) },
        },
        { $set: { state: ContractState.EXPIRED } },
      )
      .exec();
    return result.modifiedCount ?? 0;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { name: 'hr-contracts-expire' })
  async expireOverdueCron(): Promise<void> {
    try {
      const count = await this.expireOverdue();
      if (count > 0)
        this.logger.log(`${count} contrat(s) passé(s) à « expiré »`);
    } catch (error) {
      this.logger.error(
        `Échec de l'expiration des contrats : ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
