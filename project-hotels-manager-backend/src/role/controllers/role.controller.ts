// src/modules/roles/controllers/role.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import {
  PermissionDto,
  PermissionCheckResponseDto,
} from '../dto/permission.dto';
import { RoleResponseDto } from '../dto/role-response.dto';
// IMPORTER LE TYPE ROLE
import { Role } from '../schemas/role.schema';

// COMMENTAIRES TEMPORAIRES - À décommenter quand les fichiers d'auth existeront
// import { AuthGuard } from '../../auth/guards/auth.guard';
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
// @UseGuards(AuthGuard, RolesGuard) // À décommenter quand les guards existeront
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // ========================
  // CRUD
  // ========================

  @Post()
  // @Roles('super_admin', 'admin') // À décommenter quand le décorateur existera
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  @ApiResponse({
    status: 201,
    description: 'Rôle créé avec succès',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Rôle déjà existant' })
  create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les rôles' })
  @ApiResponse({
    status: 200,
    description: 'Liste des rôles',
    type: [RoleResponseDto],
  })
  findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Récupérer les rôles actifs' })
  @ApiResponse({
    status: 200,
    description: 'Liste des rôles actifs',
    type: [RoleResponseDto],
  })
  findActive(): Promise<Role[]> {
    return this.roleService.findActive();
  }

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des rôles' })
  @ApiQuery({ name: 'q', description: 'Terme de recherche' })
  @ApiResponse({
    status: 200,
    description: 'Résultats de recherche',
    type: [RoleResponseDto],
  })
  search(@Query('q') searchTerm: string): Promise<Role[]> {
    return this.roleService.search(searchTerm);
  }

  @Get('level/:level')
  @ApiOperation({ summary: 'Récupérer les rôles par niveau' })
  @ApiParam({ name: 'level', description: 'Niveau du rôle (0-4)' })
  @ApiResponse({
    status: 200,
    description: 'Liste des rôles par niveau',
    type: [RoleResponseDto],
  })
  findByLevel(@Param('level') level: number): Promise<Role[]> {
    return this.roleService.findByLevel(level);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Récupérer un rôle par son code' })
  @ApiParam({ name: 'code', description: 'Code du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Rôle trouvé',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  findByCode(@Param('code') code: string): Promise<Role> {
    return this.roleService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un rôle par ID' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Rôle trouvé',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(id);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: "Récupérer les permissions d'un rôle" })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 200, description: 'Liste des permissions' })
  getPermissions(@Param('id') id: string): Promise<string[]> {
    return this.roleService.getPermissions(id);
  }

  @Patch(':id')
  // @Roles('super_admin', 'admin') // À décommenter quand le décorateur existera
  @ApiOperation({ summary: 'Mettre à jour un rôle' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Rôle mis à jour',
    type: RoleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    return this.roleService.update(id, updateRoleDto);
  }

  @Post(':id/permissions')
  // @Roles('super_admin', 'admin') // À décommenter quand le décorateur existera
  @ApiOperation({ summary: 'Ajouter une permission à un rôle' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Permission ajoutée',
    type: RoleResponseDto,
  })
  addPermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<Role> {
    return this.roleService.addPermission(id, permission);
  }

  @Delete(':id/permissions')
  // @Roles('super_admin', 'admin') // À décommenter quand le décorateur existera
  @ApiOperation({ summary: "Retirer une permission d'un rôle" })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Permission retirée',
    type: RoleResponseDto,
  })
  removePermission(
    @Param('id') id: string,
    @Body('permission') permission: string,
  ): Promise<Role> {
    return this.roleService.removePermission(id, permission);
  }

  @Post(':id/permissions/check')
  @ApiOperation({ summary: "Vérifier les permissions d'un rôle" })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({
    status: 200,
    description: 'Résultat de la vérification',
    type: PermissionCheckResponseDto,
  })
  checkPermissions(
    @Param('id') id: string,
    @Body() permissionDto: PermissionDto,
  ): Promise<PermissionCheckResponseDto> {
    return this.roleService.checkPermissions(id, permissionDto.permissions);
  }

  @Delete(':id')
  // @Roles('super_admin') // À décommenter quand le décorateur existera
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un rôle' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 204, description: 'Rôle supprimé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  remove(@Param('id') id: string): Promise<Role> {
    return this.roleService.remove(id);
  }

  @Get('stats/overview')
  // @Roles('super_admin', 'admin') // À décommenter quand le décorateur existera
  @ApiOperation({ summary: 'Obtenir les statistiques des rôles' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  getStats(): Promise<any> {
    return this.roleService.getStats();
  }
}
