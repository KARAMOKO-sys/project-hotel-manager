import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseCrudService } from '../../common/services/base-crud.service';
import { Guest, GuestDocument } from '../schemas/guest.entity';
import { CreateGuestDto } from '../dto/create-guest.dto';
import { UpdateGuestDto } from '../dto/update-guest.dto';

/**
 * Service de gestion des clients (guests).
 *
 * Étend le CRUD générique et ajoute la recherche, le profil, l'activation du
 * compte ainsi que la gestion des points de fidélité.
 */
@Injectable()
export class GuestService extends BaseCrudService<
  Guest,
  CreateGuestDto,
  UpdateGuestDto
> {
  constructor(
    @InjectModel(Guest.name)
    protected readonly guestModel: Model<GuestDocument>,
  ) {
    super(guestModel, Guest.name);
  }

  /** Crée un client en hashant son mot de passe. */
  async create(createGuestDto: CreateGuestDto): Promise<Guest> {
    const { password, ...rest } = createGuestDto;
    const guest = new this.guestModel(rest as any);

    await guest.setPassword(password);

    return (await guest.save()) as unknown as Guest;
  }

  /** Recherche un client par email. */
  async findByEmail(email: string): Promise<Guest> {
    const guest = await this.repository.findOne({ email });
    if (!guest) {
      throw new NotFoundException(`Guest avec l'email ${email} introuvable`);
    }
    return guest;
  }

  /** Recherche textuelle sur nom, prénom, email, téléphone. */
  async search(searchTerm: string): Promise<Guest[]> {
    return this.guestModel
      .find({
        $or: [
          { first_name: { $regex: searchTerm, $options: 'i' } },
          { last_name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { phone: { $regex: searchTerm, $options: 'i' } },
        ],
        is_deleted: { $ne: true },
      })
      .exec() as unknown as Promise<Guest[]>;
  }

  /** Active le compte client. */
  async activate(id: string): Promise<Guest> {
    return this.update(id, { is_active: true } as UpdateGuestDto);
  }

  /** Désactive le compte client. */
  async deactivate(id: string): Promise<Guest> {
    return this.update(id, { is_active: false } as UpdateGuestDto);
  }

  /** Met à jour le profil public du client. */
  async updateProfile(id: string, profile: UpdateGuestDto): Promise<Guest> {
    return this.update(id, profile);
  }

  /** Ajoute des points de fidélité. */
  async addLoyaltyPoints(id: string, points: number): Promise<Guest> {
    const guest = await this.findOne(id);
    guest.addLoyaltyPoints(points);
    return (await guest.save()) as unknown as Guest;
  }

  /** Utilise des points de fidélité. */
  async redeemLoyaltyPoints(id: string, points: number): Promise<Guest> {
    const guest = await this.findOne(id);
    guest.redeemLoyaltyPoints(points);
    return (await guest.save()) as unknown as Guest;
  }

  /** Récupère l'historique de fidélité du client. */
  async getLoyaltyHistory(id: string): Promise<Guest['loyalty_transactions']> {
    const guest = await this.findOne(id);
    return guest.getLoyaltyHistory();
  }

  /** Retourne le tri par défaut : clients les plus récents d'abord. */
  protected getDefaultSort(): string {
    return '-created_at';
  }
}
