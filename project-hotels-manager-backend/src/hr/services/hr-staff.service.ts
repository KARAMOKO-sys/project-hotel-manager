import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EmploymentStatus, Staff } from '../../staff/schemas/staff.entity';
import { toObjectId } from '../hr.utils';

/** Vue minimale d'une affectation `Staff` utilisée par les RH. */
export interface HrStaffRef {
  _id: Types.ObjectId;
  property_id: Types.ObjectId;
  organization_id?: Types.ObjectId;
  user_id: Types.ObjectId;
  position: string;
  employee_code?: string;
  employment_status: EmploymentStatus;
}

/**
 * Accès en lecture aux affectations du personnel (`staff`), socle sur lequel
 * s'appuient contrats, congés, planning et pointage (via `staff_id`).
 */
@Injectable()
export class HrStaffService {
  constructor(
    @InjectModel(Staff.name) private readonly staffModel: Model<Staff>,
  ) {}

  /**
   * Charge une affectation existante. Si `propertyId` est fourni, vérifie
   * qu'elle appartient bien à cet établissement. Les affectations terminées
   * sont refusées sauf `allowTerminated`.
   */
  async get(
    staffId: string | Types.ObjectId,
    propertyId?: string | Types.ObjectId,
    options: { allowTerminated?: boolean } = {},
  ): Promise<HrStaffRef> {
    const id = toObjectId(staffId, 'staff_id');
    const staff = await this.staffModel
      .findOne({ _id: id, is_deleted: { $ne: true } })
      .select(
        'property_id organization_id user_id position employee_code employment_status',
      )
      .lean()
      .exec();
    if (!staff) {
      throw new NotFoundException(`Employé introuvable (id: ${String(id)})`);
    }
    const ref = staff as unknown as HrStaffRef;
    if (propertyId && String(ref.property_id) !== String(propertyId)) {
      throw new BadRequestException(
        "L'employé n'est pas affecté à cet établissement",
      );
    }
    if (
      !options.allowTerminated &&
      ref.employment_status === EmploymentStatus.TERMINATED
    ) {
      throw new BadRequestException("L'employé a quitté l'établissement");
    }
    return ref;
  }

  /** Affectations en cours (hors départ) d'un établissement. */
  async listCurrent(
    propertyId: string | Types.ObjectId,
  ): Promise<HrStaffRef[]> {
    const rows = await this.staffModel
      .find({
        property_id: toObjectId(propertyId, 'property_id'),
        is_deleted: { $ne: true },
        employment_status: { $ne: EmploymentStatus.TERMINATED },
      })
      .select(
        'property_id organization_id user_id position employee_code employment_status',
      )
      .lean()
      .exec();
    return rows;
  }

  /** Affectations par identifiants (pour enrichir les rapports). */
  async findMany(ids: Types.ObjectId[]): Promise<HrStaffRef[]> {
    if (ids.length === 0) return [];
    const rows = await this.staffModel
      .find({ _id: { $in: ids } })
      .select(
        'property_id organization_id user_id position employee_code employment_status',
      )
      .lean()
      .exec();
    return rows;
  }
}
