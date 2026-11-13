/**
 * Point d'entrée public du module d'authentification.
 *
 * Exemple d'utilisation dans un autre module :
 *
 * ```ts
 * Les gardes d'authentification et d'autorisation sont enregistrés au niveau
 * de l'application ; utilisez `@Public()` pour les seules routes publiques.
 * @Roles('owner', 'receptionist')
 * @Get()
 * findAll(@CurrentUser() user: AuthenticatedUser) { ... }
 * ```
 */
export * from './auth.module';
export * from './auth.constants';
export * from './guards/jwt-auth.guard';
export * from './guards/roles.guard';
export * from './decorators/public.decorator';
export * from './decorators/roles.decorator';
export * from './decorators/permissions.decorator';
export * from './decorators/current-user.decorator';
export * from './decorators/client-info.decorator';
export * from './interfaces/authenticated-user.interface';
export * from './services/auth.service';
export * from './services/user-accounts.service';
export * from './services/auth-notifier.service';
