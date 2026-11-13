import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../auth.constants';

/**
 * Restreint une route aux utilisateurs possédant au moins un des rôles donnés
 * (code de rôle ou type d'utilisateur, ex. `'owner'`, `'receptionist'`).
 * À utiliser avec `@UseGuards(JwtAuthGuard, RolesGuard)`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
