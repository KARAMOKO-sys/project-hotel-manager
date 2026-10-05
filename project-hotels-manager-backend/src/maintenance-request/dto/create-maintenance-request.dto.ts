import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MaintenanceCategory } from '../../base-entities/enums/maintenance-category.enum';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

export class CreateMaintenanceRequestDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsOptional()
  @IsEnum(MaintenanceCategory)
  category?: MaintenanceCategory;

  @IsString()
  @Length(2, 255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;
}
