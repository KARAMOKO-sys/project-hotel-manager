import { IsMongoId } from 'class-validator';

/**
 * DTO de paramètre d'URL pour les identifiants MongoDB.
 *
 * Permet de valider qu'un `:id` est bien un ObjectId Mongo valide avant même
 * d'atteindre le service, renvoyant une erreur 400 si ce n'est pas le cas.
 */
export class IdParamDto {
  @IsMongoId({ message: 'Identifiant invalide' })
  id!: string;
}
