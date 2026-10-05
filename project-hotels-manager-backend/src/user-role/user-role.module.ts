import { Module } from '@nestjs/common';
import { UserRoleService } from './services/user-role.service';
import { UserRoleController } from './controllers/user-role.controller';

@Module({
  controllers: [UserRoleController],
  providers: [UserRoleService],
})
export class UserRoleModule {}
