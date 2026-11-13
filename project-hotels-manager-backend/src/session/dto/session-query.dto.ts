import { IsEnum, IsOptional } from 'class-validator';
import { UserType } from '../../base-entities/enums/user-type.enum';

/** Filtre optionnel par type d'utilisateur pour les routes d'administration. */
export class SessionUserQueryDto {
  @IsOptional()
  @IsEnum(UserType)
  user_type?: UserType;
}
