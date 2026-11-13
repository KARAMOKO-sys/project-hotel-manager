import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../auth.constants';

/**
 * Remplace la permission CRUD déduite de la route par une ou plusieurs
 * permissions métier plus précises.
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
