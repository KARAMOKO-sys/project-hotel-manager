import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Normalise un email (minuscules, sans espaces). */
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Politique de mot de passe : 8 à 128 caractères, au moins une lettre et un chiffre. */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;
const PASSWORD_MESSAGE =
  'Le mot de passe doit contenir 8 à 128 caractères, dont au moins une lettre et un chiffre';

/** Inscription d'un nouveau client. */
export class RegisterDto {
  @ApiProperty({ example: 'Awa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty({ example: 'Koné' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty({ example: 'awa.kone@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'MotDePasse123' })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiPropertyOptional({ example: 'awak' })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  pseudo?: string;

  @ApiPropertyOptional({ example: '+2250700000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}

/** Connexion par email / mot de passe. */
export class LoginDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  /**
   * Type de compte visé lorsqu'un même email existe dans plusieurs
   * collections (ex. client et propriétaire).
   */
  @ApiPropertyOptional({ enum: UserType })
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;
}

/** Second facteur lors de la connexion. */
export class VerifyTwoFactorLoginDto {
  @ApiProperty({ description: 'Jeton temporaire renvoyé par /auth/login' })
  @IsString()
  @IsNotEmpty()
  two_factor_token!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;
}

/** Code TOTP seul (confirmation / désactivation de la 2FA). */
export class TwoFactorCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;
}

/** Rafraîchissement du jeton d'accès. */
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

/** Demande par email (réinitialisation, lien magique). */
export class EmailRequestDto {
  @ApiProperty()
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @ApiPropertyOptional({ enum: UserType })
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;
}

/** Jeton à usage unique (lien magique, vérification d'email). */
export class TokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;
}

/** Réinitialisation du mot de passe via un jeton reçu par email. */
export class ResetPasswordDto extends TokenDto {
  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  new_password!: string;
}

/** Changement de mot de passe par l'utilisateur connecté. */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(128)
  current_password!: string;

  @ApiProperty()
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  new_password!: string;
}
