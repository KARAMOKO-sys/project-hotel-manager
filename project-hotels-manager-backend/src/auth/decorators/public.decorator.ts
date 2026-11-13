import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../auth.constants';

/**
 * Marque une route (ou un contrôleur) comme publique : `JwtAuthGuard` et
 * `RolesGuard` la laissent passer sans jeton.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
