import { IsMongoId, IsOptional } from 'class-validator';

export class AddMemberDto {
  @IsMongoId({ message: 'Identifiant utilisateur invalide' })
  user_id!: string;

  @IsOptional()
  @IsMongoId({ message: 'Identifiant rôle invalide' })
  role_id?: string;
}
