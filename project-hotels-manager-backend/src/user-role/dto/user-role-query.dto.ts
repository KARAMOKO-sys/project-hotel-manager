import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Filtres de consultation des rôles d'un utilisateur. */
export class UserRoleQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;

  /** Inclut les rôles limités à cet établissement (en plus des rôles globaux). */
  @IsOptional()
  @IsMongoId()
  property_id?: string;
}
