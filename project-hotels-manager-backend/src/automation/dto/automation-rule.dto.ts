import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { DOMAIN_EVENT_NAMES } from '../../platform/events/domain-events';
import type { DomainEventName } from '../../platform/events/domain-events';
import {
  ConditionLogic,
  ConditionOperator,
} from '../engine/condition-evaluator';
import { AutomationActionType } from '../engine/rule-validator';
import { AutomationRunStatus } from '../schemas/automation-run.entity';

const toBoolean = ({ value }: { value: unknown }) =>
  value === 'true' ? true : value === 'false' ? false : value;

export class RuleConditionDto {
  @IsString()
  @MaxLength(200)
  path!: string;

  @IsEnum(ConditionOperator)
  operator!: ConditionOperator;

  /** Valeur de comparaison (liste pour in / not_in, absente pour is_set). */
  @IsOptional()
  value?: unknown;
}

export class RuleActionDto {
  @IsEnum(AutomationActionType)
  type!: AutomationActionType;

  @IsObject()
  params!: Record<string, unknown>;
}

/** Création d'une règle (portée organisation OU établissement). */
export class CreateAutomationRuleDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(DOMAIN_EVENT_NAMES)
  trigger_event!: DomainEventName;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  @ArrayMaxSize(20)
  conditions?: RuleConditionDto[];

  @IsOptional()
  @IsEnum(ConditionLogic)
  condition_logic?: ConditionLogic;

  @ValidateNested({ each: true })
  @Type(() => RuleActionDto)
  @ArrayMaxSize(10)
  actions!: RuleActionDto[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

/** Mise à jour : la portée ne change pas. */
export class UpdateAutomationRuleDto extends PartialType(
  OmitType(CreateAutomationRuleDto, [
    'organization_id',
    'property_id',
  ] as const),
) {}

export class AutomationRuleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  organization_id?: string;

  @IsOptional()
  @IsMongoId()
  property_id?: string;

  @IsOptional()
  @IsIn(DOMAIN_EVENT_NAMES)
  trigger_event?: DomainEventName;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  is_active?: boolean;
}

/** Événement d'exemple pour un essai à blanc. */
export class TestAutomationRuleDto {
  @IsOptional()
  @IsObject()
  event?: Record<string, unknown>;
}

export class AutomationRunQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsMongoId()
  rule_id?: string;

  @IsOptional()
  @IsEnum(AutomationRunStatus)
  status?: AutomationRunStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  event_id?: string;
}
