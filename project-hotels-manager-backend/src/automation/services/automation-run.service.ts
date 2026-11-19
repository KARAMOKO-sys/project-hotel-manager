import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AutomationRun } from '../schemas/automation-run.entity';
import { AutomationRunQueryDto } from '../dto/automation-rule.dto';

/** Consultation du journal d'exécution des règles (lecture seule). */
@Injectable()
export class AutomationRunService extends BaseCrudService<AutomationRun> {
  constructor(
    @InjectModel(AutomationRun.name)
    private readonly runModel: Model<AutomationRun>,
  ) {
    super(runModel, 'Exécution d’automatisation');
  }

  async findAll(
    query: AutomationRunQueryDto,
    filter: QueryFilter<AutomationRun> = {},
  ): Promise<PaginatedResult<AutomationRun>> {
    const criteria: Record<string, unknown> = { ...filter };
    if (query.rule_id) criteria.rule_id = new Types.ObjectId(query.rule_id);
    if (query.status) criteria.status = query.status;
    if (query.event_id) criteria.event_id = query.event_id;
    return super.findAll(query, criteria);
  }
}
