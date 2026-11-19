import { IsMongoId, IsString, MaxLength } from 'class-validator';

/** Paramètres d'URL `:model/:id` d'une fiche du registre. */
export class RecordParamsDto {
  @IsString()
  @MaxLength(100)
  model!: string;

  @IsMongoId({ message: 'Identifiant de fiche invalide' })
  id!: string;
}
