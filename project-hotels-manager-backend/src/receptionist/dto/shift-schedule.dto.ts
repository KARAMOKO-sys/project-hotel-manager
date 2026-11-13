import { Type } from 'class-transformer';
import { IsOptional, Matches, ValidateNested } from 'class-validator';

/** Format accepté pour une heure de service : `HH:mm` ou `off`. */
export const SHIFT_TIME_REGEX = /^(off|([01]\d|2[0-3]):[0-5]\d)$/;

/** Créneau de travail d'une journée. */
export class DayShiftDto {
  @Matches(SHIFT_TIME_REGEX, {
    message: 'start doit être au format HH:mm ou off',
  })
  start!: string;

  @Matches(SHIFT_TIME_REGEX, {
    message: 'end doit être au format HH:mm ou off',
  })
  end!: string;
}

/** Planning hebdomadaire d'un réceptionniste. */
export class ShiftScheduleDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  monday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  tuesday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  wednesday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  thursday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  friday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  saturday?: DayShiftDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  sunday?: DayShiftDto;
}
