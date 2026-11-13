import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Corps de la route de changement de mot de passe. */
export class ChangeAccountantPasswordDto {
  @IsString()
  current_password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  new_password!: string;
}

/** Corps de la route de suspension (raison optionnelle). */
export class SuspendAccountantDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/** Corps de la route de mise à jour des habilitations financières. */
export class UpdateAccountantPermissionsDto {
  @IsOptional()
  @IsBoolean()
  can_create_invoices?: boolean;

  @IsOptional()
  @IsBoolean()
  can_process_refunds?: boolean;

  @IsOptional()
  @IsBoolean()
  can_export_reports?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  approval_limit?: number;
}

/** Corps des routes d'ajout / retrait de certification. */
export class AccountantCertificationDto {
  @IsString()
  @Length(1, 100)
  certification!: string;
}
