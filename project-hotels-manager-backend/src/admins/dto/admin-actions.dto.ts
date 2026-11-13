import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsIP,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Corps de la route de changement de mot de passe. */
export class ChangeAdminPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de modification du niveau d'accès. */
export class UpdateAccessLevelDto {
  @IsInt()
  @Min(1)
  @Max(5)
  access_level!: number;
}

/** Corps de la route de mise à jour de la liste blanche d'IP. */
export class UpdateIpWhitelistDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsIP(undefined, { each: true })
  ip_whitelist!: string[];
}
