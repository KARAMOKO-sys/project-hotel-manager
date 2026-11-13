import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRoleService } from '../services/user-role.service';
import { CreateUserRoleDto } from '../dto/create-user-role.dto';
import { UserRoleQueryDto } from '../dto/user-role-query.dto';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SUPER_ADMIN_ROLE } from '../../auth/auth.constants';
import { UserType } from '../../base-entities/enums/user-type.enum';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

/**
 * Assignation des rôles aux utilisateurs.
 *
 * - `/user-roles/me…` : rôles et permissions de l'utilisateur connecté.
 * - Assignation et consultation : super administrateur et propriétaires
 *   (un propriétaire ne peut pas assigner de rôle système/administration).
 * - Suppression : super administrateur uniquement.
 */
@ApiTags('User roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('user-roles')
export class UserRoleController {
  constructor(private readonly userRoleService: UserRoleService) {}

  /** Rôles de l'utilisateur connecté. */
  @Get('me')
  @Permissions('user-roles:read:self')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserRoleQueryDto,
  ) {
    return this.userRoleService.getUserRoles(user.sub, {
      userType: user.user_type,
      propertyId: query.property_id,
    });
  }

  /** Permissions de l'utilisateur connecté. */
  @Get('me/permissions')
  @Permissions('user-roles:read:self')
  findMyPermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: UserRoleQueryDto,
  ) {
    return this.userRoleService.getUserPermissions(user.sub, {
      userType: user.user_type,
      propertyId: query.property_id,
    });
  }

  /** Assigne un rôle à un utilisateur. */
  @Post()
  @Permissions('user-roles:assign')
  assign(
    @Body() dto: CreateUserRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.userRoleService.assignRole(dto, {
      id: user.sub,
      user_type: user.user_type,
      is_super_admin:
        user.user_type === UserType.SUPER_ADMIN ||
        user.roles?.includes(SUPER_ADMIN_ROLE),
    });
  }

  /** Rôles d'un utilisateur. */
  @Get('user/:id')
  @Permissions('user-roles:read')
  findByUser(@Param() { id }: IdParamDto, @Query() query: UserRoleQueryDto) {
    return this.userRoleService.getUserRoles(id, {
      userType: query.user_type,
      propertyId: query.property_id,
    });
  }

  /** Permissions d'un utilisateur. */
  @Get('user/:id/permissions')
  @Permissions('user-roles:read')
  findPermissions(
    @Param() { id }: IdParamDto,
    @Query() query: UserRoleQueryDto,
  ) {
    return this.userRoleService.getUserPermissions(id, {
      userType: query.user_type,
      propertyId: query.property_id,
    });
  }

  /** Supprime une assignation de rôle. */
  @Delete(':id')
  @Permissions('user-roles:remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() { id }: IdParamDto): Promise<void> {
    return this.userRoleService.removeById(id);
  }
}
