import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { TaskPriority } from '../../base-entities/enums/task-priority.enum';
import { TaskStatus } from '../../base-entities/enums/task-status.enum';

export class CreateGuestRequestDto {
  @IsMongoId()
  property_id!: string;

  @IsOptional()
  @IsMongoId()
  guest_id?: string;

  @IsOptional()
  @IsMongoId()
  room_id?: string;

  @IsOptional()
  @IsMongoId()
  staff_id?: string;

  @IsString()
  @Length(1, 100)
  type!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
