import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  APP_BY_KEY,
  APP_CATALOG,
  APP_CATEGORIES,
  AppDefinition,
  resolveDependencies,
  resolveDependents,
} from './app-catalog';
import { AppState, OrganizationApp } from './organization-app.entity';
import { DomainEventPublisher } from '../events/domain-event.publisher';
import { DomainEvents } from '../events/domain-events';

export interface AppView extends AppDefinition {
  category_label: string;
  installed: boolean;
  /** Applications installées qui empêchent la désinstallation. */
  blocking_dependents: string[];
}

const CACHE_TTL_MS = 30_000;

/** Installation et désinstallation des applications par organisation. */
@Injectable()
export class AppsService {
  private readonly cache = new Map<
    string,
    { installed: Set<string>; expiresAt: number }
  >();

  constructor(
    @InjectModel(OrganizationApp.name)
    private readonly appModel: Model<OrganizationApp>,
    private readonly events: DomainEventPublisher,
  ) {}

  /** Clés des applications installées pour une organisation. */
  async getInstalledKeys(organizationId: string): Promise<Set<string>> {
    this.assertObjectId(organizationId);
    const cached = this.cache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) return cached.installed;

    const rows = await this.appModel
      .find({ organization_id: new Types.ObjectId(organizationId) })
      .lean()
      .exec();
    const explicit = new Map(rows.map((row) => [row.app_key, row.state]));
    const installed = new Set<string>();
    for (const app of APP_CATALOG) {
      const state = explicit.get(app.key);
      if (
        app.core ||
        state === AppState.INSTALLED ||
        (state === undefined && app.default_installed)
      ) {
        installed.add(app.key);
      }
    }
    // Une application dont une dépendance n'est pas installée est inutilisable.
    for (const key of [...installed]) {
      if (!resolveDependencies(key).every((dep) => installed.has(dep))) {
        installed.delete(key);
      }
    }
    this.cache.set(organizationId, {
      installed,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return installed;
  }

  async isInstalled(organizationId: string, key: string): Promise<boolean> {
    return (await this.getInstalledKeys(organizationId)).has(key);
  }

  /** Catalogue complet avec l'état pour l'organisation. */
  async list(organizationId: string): Promise<AppView[]> {
    const installed = await this.getInstalledKeys(organizationId);
    return APP_CATALOG.map((app) => ({
      ...app,
      category_label: APP_CATEGORIES[app.category],
      installed: installed.has(app.key),
      blocking_dependents: resolveDependents(app.key).filter((key) =>
        installed.has(key),
      ),
    }));
  }

  /** Installe une application et ses dépendances manquantes. */
  async install(
    organizationId: string,
    key: string,
    actorId?: string,
  ): Promise<{ installed: string[] }> {
    this.getDefinition(key);
    const before = await this.getInstalledKeys(organizationId);
    const toInstall = resolveDependencies(key).filter((k) => !before.has(k));
    for (const appKey of toInstall) {
      await this.setState(organizationId, appKey, AppState.INSTALLED, actorId);
    }
    this.cache.delete(organizationId);
    for (const appKey of toInstall) {
      await this.events.publish(DomainEvents.APP_INSTALLED, {
        organization_id: organizationId,
        actor_id: actorId,
        payload: { app_key: appKey },
      });
    }
    return { installed: toInstall };
  }

  /** Désinstalle une application (refusé si d'autres en dépendent). */
  async uninstall(
    organizationId: string,
    key: string,
    actorId?: string,
  ): Promise<{ uninstalled: string }> {
    const app = this.getDefinition(key);
    if (app.core) {
      throw new BadRequestException(
        `L'application « ${app.name} » fait partie du socle`,
      );
    }
    const installed = await this.getInstalledKeys(organizationId);
    const blocking = resolveDependents(key).filter((k) => installed.has(k));
    if (blocking.length > 0) {
      throw new ConflictException(
        `Désinstallez d'abord : ${blocking
          .map((k) => APP_BY_KEY.get(k)?.name ?? k)
          .join(', ')}`,
      );
    }
    await this.setState(organizationId, key, AppState.UNINSTALLED, actorId);
    this.cache.delete(organizationId);
    await this.events.publish(DomainEvents.APP_UNINSTALLED, {
      organization_id: organizationId,
      actor_id: actorId,
      payload: { app_key: key },
    });
    return { uninstalled: key };
  }

  private getDefinition(key: string): AppDefinition {
    const app = APP_BY_KEY.get(key);
    if (!app) throw new NotFoundException(`Application inconnue : ${key}`);
    return app;
  }

  private async setState(
    organizationId: string,
    key: string,
    state: AppState,
    actorId?: string,
  ) {
    const now = new Date();
    await this.appModel
      .updateOne(
        { organization_id: new Types.ObjectId(organizationId), app_key: key },
        {
          $set: {
            state,
            changed_by: actorId,
            ...(state === AppState.INSTALLED
              ? { installed_at: now }
              : { uninstalled_at: now }),
          },
        },
        { upsert: true },
      )
      .exec();
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Identifiant d’organisation invalide');
    }
  }
}
