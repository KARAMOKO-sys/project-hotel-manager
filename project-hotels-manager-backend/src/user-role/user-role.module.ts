import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRoleService } from './services/user-role.service';
import { UserRoleController } from './controllers/user-role.controller';
import { UserRole, UserRoleSchema } from './schemas/user-role.entity';
import { Role, RoleSchema } from '../role/schemas/role.schema';

/**
 * Module d'assignation des rôles aux utilisateurs.
 *
 * Enregistre aussi le modèle `Role` pour résoudre les permissions sans
 * dépendre de `RoleModule`. Les gardes du contrôleur nécessitent
 * `JwtService`, fourni globalement par `AuthModule`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
  ],
  controllers: [UserRoleController],
  providers: [UserRoleService],
  exports: [UserRoleService],
})
export class UserRoleModule {}
