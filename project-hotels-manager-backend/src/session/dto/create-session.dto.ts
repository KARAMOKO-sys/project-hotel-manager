import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { UserType } from '../../base-entities/enums/user-type.enum';

/**
 * Données nécessaires à la création d'une session.
 *
 * Usage interne (AuthService) : aucune route publique ne crée de session
 * directement, elles sont créées lors de la connexion.
 */
export class CreateSessionDto {
  @IsMongoId()
  user_id!: string;

  @IsEnum(UserType)
  user_type!: UserType;

  @IsOptional()
  @IsString()
  user_agent?: string;

  @IsOptional()
  @IsString()
  ip?: string;

  /** Durée de vie de la session en secondes (défaut : configuration JWT). */
  @IsOptional()
  @IsInt()
  @Min(1)
  ttl_seconds?: number;
}
