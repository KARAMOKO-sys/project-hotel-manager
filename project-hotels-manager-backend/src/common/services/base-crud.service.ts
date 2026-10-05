import { NotFoundException } from '@nestjs/common';
import { Model, QueryFilter } from 'mongoose';
import { BaseRepository } from '../repositories/base.repository';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

/**
 * Service CRUD générique.
 *
 * Fournit une implémentation standard de `create`, `findAll`, `findOne`,
 * `update`, `remove` et `restore`, réutilisable par tous les modules.
 *
 * Chaque service concret étend cette classe et injecte son modèle Mongoose :
 *
 * ```ts
 * @Injectable()
 * export class FooService extends BaseCrudService<Foo, CreateFooDto, UpdateFooDto> {
 *   constructor(@InjectModel(Foo.name) model: Model<FooDocument>) {
 *     super(model, Foo.name);
 *   }
 * }
 * ```
 */
export abstract class BaseCrudService<
  T,
  CreateDto = Partial<T>,
  UpdateDto = Partial<T>,
> {
  protected readonly repository: BaseRepository<T>;

  protected constructor(
    protected readonly model: Model<T>,
    protected readonly entityName: string,
  ) {
    this.repository = new BaseRepository<T>(model);
  }

  /** Crée un document à partir du DTO de création. */
  async create(createDto: CreateDto): Promise<T> {
    return this.repository.create(createDto as Partial<T>);
  }

  /**
   * Liste les documents avec pagination.
   * `filter` permet d'ajouter des filtres métier propres au service.
   */
  async findAll(
    query: PaginationQueryDto,
    filter: QueryFilter<T> = {},
  ): Promise<PaginatedResult<T>> {
    const baseFilter = {
      is_deleted: { $ne: true },
      ...filter,
    } as QueryFilter<T>;

    return this.paginate(baseFilter, query);
  }

  /** Récupère un document par identifiant ou lève une 404. */
  async findOne(id: string): Promise<T> {
    const doc = await this.repository.findById(id);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Récupère un document par filtre ou lève une 404. */
  async findOneOrFail(filter: QueryFilter<T>): Promise<T> {
    const doc = await this.repository.findOne(filter);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable`);
    }
    return doc;
  }

  /** Met à jour un document ou lève une 404. */
  async update(id: string, updateDto: UpdateDto): Promise<T> {
    const doc = await this.repository.update(id, updateDto as never);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /**
   * Suppression logique par défaut (cohérent avec `AuditableEntity`).
   * Les services dont l'entité n'a pas de champ `is_deleted` doivent
   * surcharger cette méthode pour faire une suppression physique.
   */
  async remove(id: string): Promise<T> {
    const doc = await this.repository.softRemove(id);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Restaure un document supprimé logiquement. */
  async restore(id: string): Promise<T> {
    const doc = await this.repository.restore(id);
    if (!doc) {
      throw new NotFoundException(`${this.entityName} introuvable (id: ${id})`);
    }
    return doc;
  }

  /** Retourne le tri par défaut utilisé par `paginate`. */
  protected getDefaultSort(): string {
    return '-created_at';
  }

  /**
   * Applique la pagination à un filtre et retourne un résultat structuré.
   * Surchargée par les services qui ont besoin de projection/population.
   */
  protected async paginate(
    filter: QueryFilter<T>,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? this.getDefaultSort();

    const [data, total] = await Promise.all([
      this.repository.find(filter, { sort, skip, limit }),
      this.repository.count(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
