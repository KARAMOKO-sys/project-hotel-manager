import { IsDateString, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Assignation d'un rôle à un utilisateur. */
export class CreateUserRoleDto {
  @IsMongoId()
  user_id!: string;

  @IsEnum(UserType)
  user_type!: UserType;

  @IsMongoId()
  role_id!: string;

  /** Limite le rôle à un établissement. */
  @IsOptional()
  @IsMongoId()
  property_id?: string;

  /** Date d'expiration (ISO 8601) du rôle. */
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
