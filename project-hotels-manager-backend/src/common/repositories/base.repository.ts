import { Model, QueryFilter, QueryOptions, Types, UpdateQuery } from 'mongoose';

/**
 * Repository générique Mongoose fournissant les opérations CRUD de base.
 *
 * Tous les services concrets héritent de `BaseCrudService`, qui instancie ce
 * repository à partir du modèle Mongoose injecté. Centraliser ces opérations
 * évite de dupliquer la logique de persistance dans chaque module.
 */
export class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  /** Crée un document à partir d'un objet partiel. */
  async create(data: Partial<T>): Promise<T> {
    const created = new this.model(data as any);
    return (await created.save()) as unknown as T;
  }

  /** Liste les documents correspondant à un filtre, triés. */
  async find(
    filter: QueryFilter<T> = {},
    options: { sort?: string; skip?: number; limit?: number } = {},
  ): Promise<T[]> {
    let query = this.model.find(filter);
    if (options.sort) {
      query = query.sort(options.sort);
    }
    if (options.skip !== undefined) {
      query = query.skip(options.skip);
    }
    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }
    return (await query.lean().exec()) as unknown as T[];
  }

  /** Récupère un document par son identifiant (null si introuvable). */
  async findById(id: string | Types.ObjectId): Promise<T | null> {
    return (await this.model.findById(id).exec()) as unknown as T | null;
  }

  /** Récupère le premier document correspondant au filtre. */
  async findOne(
    filter: QueryFilter<T>,
    options?: { select?: string; populate?: string },
  ): Promise<T | null> {
    let query = this.model.findOne(filter);
    if (options?.select) {
      query = query.select(options.select);
    }
    if (options?.populate) {
      query = query.populate(options.populate);
    }
    return (await query.exec()) as unknown as T | null;
  }

  /** Met à jour un document et retourne la version à jour. */
  async update(
    id: string | Types.ObjectId,
    data: UpdateQuery<T>,
  ): Promise<T | null> {
    return (await this.model
      .findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      } as QueryOptions<T>)
      .exec()) as unknown as T | null;
  }

  /**
   * Suppression logique : marque le document `is_deleted = true`.
   * Fonctionne uniquement sur les entités héritant d'`AuditableEntity`.
   */
  async softRemove(id: string | Types.ObjectId): Promise<T | null> {
    return this.update(id, {
      is_deleted: true,
      deleted_at: new Date(),
    } as unknown as UpdateQuery<T>);
  }

  /** Restaure un document supprimé logiquement. */
  async restore(id: string | Types.ObjectId): Promise<T | null> {
    return this.update(id, {
      is_deleted: false,
      deleted_at: null,
    } as unknown as UpdateQuery<T>);
  }

  /** Suppression physique du document. */
  async hardRemove(id: string | Types.ObjectId): Promise<T | null> {
    return (await this.model.findByIdAndDelete(id).exec()) as T | null;
  }

  /** Compte les documents correspondant à un filtre. */
  async count(filter: QueryFilter<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  /** Vérifie l'existence d'au moins un document correspondant au filtre. */
  async exists(filter: QueryFilter<T>): Promise<boolean> {
    return (await this.model.exists(filter)) !== null;
  }
}
