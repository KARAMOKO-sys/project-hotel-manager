// src/modules/roles/role.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DiscoveryModule } from '@nestjs/core';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';
import { Role, RoleSchema } from './schemas/role.schema';
import { PermissionCatalogService } from '../auth/permissions/permission-catalog.service';

@Module({
  imports: [
    DiscoveryModule,
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]),
  ],
  controllers: [RoleController],
  providers: [RoleService, PermissionCatalogService],
  exports: [RoleService, PermissionCatalogService],
})
export class RoleModule {}
