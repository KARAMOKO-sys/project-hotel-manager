import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Property,
  PropertyDocument,
  PropertyStatus,
} from '../schemas/property.entity';
import { PropertyQueryDto } from '../dto/property-query.dto';
import { PropertyType } from '../../base-entities/enums/property-type.enum';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { Room, RoomDocument } from '../../room/schemas/room.entity';
import {
  RoomType,
  RoomTypeDocument,
} from '../../room-type/schemas/room-type.entity';

/** Propriétés visibles publiquement. */
const ACTIVE_FILTER = {
  is_deleted: { $ne: true },
  is_active: true,
  status: PropertyStatus.ACTIVE,
};

/** Échappe les caractères spéciaux pour une utilisation dans une RegExp. */
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Service de gestion des propriétés (hôtels, résidences, etc.).
 *
 * Étend le CRUD générique et ajoute les recherches par organisation/propriétaire
 * ainsi que l'accès aux chambres et types de chambres rattachés.
 */
@Injectable()
export class PropertyService extends BaseCrudService<
  Property,
  CreatePropertyDto,
  UpdatePropertyDto
> {
  constructor(
    @InjectModel(Property.name)
    protected readonly propertyModel: Model<PropertyDocument>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    @InjectModel(RoomType.name)
    private readonly roomTypeModel: Model<RoomTypeDocument>,
  ) {
    super(propertyModel, Property.name);
  }

  /**
   * Liste paginée avec filtres optionnels : type, ville, recherche libre
   * (nom, description, ville) et propriétés actives uniquement.
   */
  findFiltered(query: PropertyQueryDto) {
    const filter: QueryFilter<Property> = {};

    if (query.type) filter.type = query.type;
    if (query.city) {
      filter['address.city'] = {
        $regex: escapeRegex(query.city.trim()),
        $options: 'i',
      };
    }
    if (query.search?.trim()) {
      const regex = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
      filter.$or = [
        { name: regex },
        { description: regex },
        { 'address.city': regex },
      ];
    }
    if (query.active) {
      filter.is_active = true;
      filter.status = PropertyStatus.ACTIVE;
    }

    return this.findAll(query, filter);
  }

  /** Nombre de propriétés actives par type (pour la vitrine). */
  async countByType(): Promise<{ type: PropertyType; count: number }[]> {
    return this.propertyModel.aggregate<{ type: PropertyType; count: number }>([
      { $match: ACTIVE_FILTER },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } },
      { $sort: { count: -1 } },
    ]);
  }

  /** Villes distinctes des propriétés actives, triées. */
  async findCities(): Promise<string[]> {
    const cities = (await this.propertyModel
      .distinct('address.city', ACTIVE_FILTER)
      .exec()) as unknown as (string | null)[];
    return cities
      .filter((city): city is string => Boolean(city?.trim()))
      .sort((a, b) => a.localeCompare(b));
  }

  /** Liste les propriétés d'une organisation (paginé). */
  findByOrganization(organizationId: string, query: PaginationQueryDto) {
    return this.findAll(query, {
      organization_id: new Types.ObjectId(organizationId),
    });
  }

  /** Liste les propriétés d'un propriétaire (paginé). */
  findByOwner(ownerId: string, query: PaginationQueryDto) {
    return this.findAll(query, { owner_id: new Types.ObjectId(ownerId) });
  }

  /** Récupère les paramètres spécifiques de la propriété. */
  async getSettings(id: string): Promise<Record<string, any>> {
    const property = await this.findOne(id);
    return property.settings ?? {};
  }

  /** Met à jour (fusionne) les paramètres de la propriété. */
  async updateSettings(
    id: string,
    settings: Record<string, any>,
  ): Promise<Property> {
    await this.findOne(id);
    return this.update(id, { settings } as UpdatePropertyDto);
  }

  /** Liste les chambres rattachées à la propriété. */
  async getRooms(id: string): Promise<Room[]> {
    await this.findOne(id);
    return this.roomModel
      .find({
        property_id: new Types.ObjectId(id),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Room[]>;
  }

  /** Liste les types de chambres de la propriété. */
  async getRoomTypes(id: string): Promise<RoomType[]> {
    await this.findOne(id);
    return this.roomTypeModel
      .find({
        property_id: new Types.ObjectId(id),
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<RoomType[]>;
  }
}
