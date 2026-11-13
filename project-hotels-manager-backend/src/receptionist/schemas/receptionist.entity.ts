// src/receptionist/schemas/receptionist.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Model, Types, SchemaTypes } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type ReceptionistDocument = Receptionist & Document;

/** Statuts possibles d'un réceptionniste. */
export enum ReceptionistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
}

/** Types de service (shift) d'un réceptionniste. */
export enum ReceptionistShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
  FLEXIBLE = 'flexible',
}

/** Jours de la semaine utilisés dans le planning (`shift_schedule`). */
export const WEEK_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

@Schema({
  timestamps: true,
  collection: 'receptionists',
  discriminatorKey: 'userType',
})
export class Receptionist extends User {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  })
  property_id!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    maxlength: 50,
  })
  employee_code!: string;

  @Prop({
    type: Date,
    required: false,
  })
  hire_date?: Date;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  position?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_modify_reservations!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  can_override_prices!: boolean;

  @Prop({
    type: Number,
    default: 10,
    min: 0,
    max: 100,
  })
  max_discount_percent!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_check_in_out!: boolean;

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  shift_schedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  reservations_processed!: number;

  @Prop({
    type: Number,
    required: false,
    min: 0,
    max: 5,
  })
  satisfaction_score?: number;

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    enum: Object.values(ReceptionistStatus),
    default: ReceptionistStatus.ACTIVE,
  })
  status?: ReceptionistStatus;

  @Prop({
    type: String,
    enum: Object.values(ReceptionistShiftType),
    default: ReceptionistShiftType.FLEXIBLE,
  })
  shift_type?: ReceptionistShiftType;

  @Prop({
    type: [String],
    default: [],
  })
  skills?: string[];

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_checkins?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_checkouts?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_cancellations?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  avg_handling_time?: number; // en minutes

  @Prop({
    type: Object,
    default: {},
  })
  preferences?: {
    notifications?: boolean;
    language?: string;
    theme?: string;
    dashboard_layout?: string;
  };

  @Prop({
    type: Date,
    required: false,
  })
  last_shift_start?: Date;

  @Prop({
    type: Date,
    required: false,
  })
  last_shift_end?: Date;

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'receptionist';
  }

  getDashboardRoute(): string {
    return '/reception/dashboard';
  }

  getPermissions(): string[] {
    const permissions = [
      'reservations:create',
      'reservations:read',
      'reservations:update',
      'checkin:create',
      'checkout:create',
      'guests:read',
      'billing:view',
    ];

    // Ajouter des permissions conditionnelles
    if (this.can_modify_reservations) {
      permissions.push('reservations:delete');
    }

    if (this.can_override_prices) {
      permissions.push('prices:override');
    }

    if (this.can_check_in_out) {
      permissions.push('checkin:create', 'checkout:create');
    }

    return permissions;
  }

  // Méthodes spécifiques aux réceptionnistes
  canApplyDiscount(percentage: number): boolean {
    return percentage <= this.max_discount_percent;
  }

  canProcessCheckin(): boolean {
    return this.can_check_in_out && this.status === ReceptionistStatus.ACTIVE;
  }

  canProcessCheckout(): boolean {
    return this.can_check_in_out && this.status === ReceptionistStatus.ACTIVE;
  }

  canModifyReservation(): boolean {
    return (
      this.can_modify_reservations && this.status === ReceptionistStatus.ACTIVE
    );
  }

  canOverridePrice(): boolean {
    return (
      this.can_override_prices && this.status === ReceptionistStatus.ACTIVE
    );
  }

  getFullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  getEmployeeDisplay(): string {
    return `${this.employee_code} - ${this.getFullName()}`;
  }

  isActive(): boolean {
    return this.status === ReceptionistStatus.ACTIVE;
  }

  isOnDuty(): boolean {
    if (!this.last_shift_start || !this.last_shift_end) return false;
    const now = new Date();
    return now >= this.last_shift_start && now <= this.last_shift_end;
  }

  incrementReservationsProcessed(): void {
    this.reservations_processed = (this.reservations_processed || 0) + 1;
  }

  incrementCheckins(): void {
    this.total_checkins = (this.total_checkins || 0) + 1;
  }

  incrementCheckouts(): void {
    this.total_checkouts = (this.total_checkouts || 0) + 1;
  }

  incrementCancellations(): void {
    this.total_cancellations = (this.total_cancellations || 0) + 1;
  }

  updateSatisfactionScore(score: number): void {
    if (score >= 0 && score <= 5) {
      if (this.satisfaction_score) {
        // Moyenne pondérée
        this.satisfaction_score = (this.satisfaction_score + score) / 2;
      } else {
        this.satisfaction_score = score;
      }
    }
  }

  getShiftSchedule(day: string): { start: string; end: string } | null {
    if (!this.shift_schedule) return null;
    const dayLower = day.toLowerCase() as WeekDay;
    if (WEEK_DAYS.includes(dayLower)) {
      return this.shift_schedule[dayLower] || null;
    }
    return null;
  }

  isWorkingDay(day: string): boolean {
    const schedule = this.getShiftSchedule(day);
    return schedule !== null && schedule.start !== 'off';
  }

  getWorkingDays(): string[] {
    if (!this.shift_schedule) return [];
    return Object.entries(this.shift_schedule)
      .filter(([, schedule]) => schedule && schedule.start !== 'off')
      .map(([day]) => day);
  }

  // Méthodes de performance
  getPerformanceMetrics(): {
    totalReservations: number;
    totalCheckins: number;
    totalCheckouts: number;
    totalCancellations: number;
    avgHandlingTime: number | null;
    satisfactionScore: number | null;
  } {
    return {
      totalReservations: this.reservations_processed || 0,
      totalCheckins: this.total_checkins || 0,
      totalCheckouts: this.total_checkouts || 0,
      totalCancellations: this.total_cancellations || 0,
      avgHandlingTime: this.avg_handling_time || null,
      satisfactionScore: this.satisfaction_score || null,
    };
  }

  // Méthodes de statut
  setOnLeave(): void {
    this.status = ReceptionistStatus.ON_LEAVE;
  }

  setActive(): void {
    this.status = ReceptionistStatus.ACTIVE;
  }

  setInactive(): void {
    this.status = ReceptionistStatus.INACTIVE;
  }

  setSuspended(): void {
    this.status = ReceptionistStatus.SUSPENDED;
  }

  // Méthodes de shift
  startShift(): void {
    this.last_shift_start = new Date();
    this.status = ReceptionistStatus.ACTIVE;
  }

  endShift(): void {
    this.last_shift_end = new Date();
  }

  // Validation
  isValid(): boolean {
    return (
      !!this.first_name &&
      !!this.last_name &&
      !!this.email &&
      !!this.employee_code &&
      this.max_discount_percent >= 0 &&
      this.max_discount_percent <= 100
    );
  }
}

export const ReceptionistSchema = SchemaFactory.createForClass(Receptionist);

// Ajout des index supplémentaires
ReceptionistSchema.index({ property_id: 1, employee_code: 1 });
ReceptionistSchema.index({ status: 1 });
ReceptionistSchema.index({ shift_type: 1 });
ReceptionistSchema.index({ 'shift_schedule.monday': 1 });
ReceptionistSchema.index({ 'shift_schedule.tuesday': 1 });
ReceptionistSchema.index({ created_at: -1 });
ReceptionistSchema.index({ reservations_processed: -1 });
ReceptionistSchema.index({ satisfaction_score: -1 });

// Middleware pre-save
/*
ReceptionistSchema.pre('save', function (next) {
  // Validation du code employé
  if (this.employee_code && this.employee_code.length > 50) {
    next(new Error('Employee code cannot exceed 50 characters'));
  }

  // Validation du pourcentage de réduction
  if (this.max_discount_percent < 0 || this.max_discount_percent > 100) {
    next(new Error('Max discount percent must be between 0 and 100'));
  }

  // Validation du score de satisfaction
  if (
    this.satisfaction_score &&
    (this.satisfaction_score < 0 || this.satisfaction_score > 5)
  ) {
    next(new Error('Satisfaction score must be between 0 and 5'));
  }

  next();
});
*/

// Middleware post-save pour l'audit
ReceptionistSchema.post('save', function (doc) {
  // Log des modifications pour audit
  console.log(
    `Receptionist ${doc.employee_code} (${doc.email}) saved at ${new Date().toISOString()}`,
  );
});

// Méthodes statiques
ReceptionistSchema.statics.findByProperty = function (
  this: Model<ReceptionistDocument>,
  propertyId: string,
) {
  return this.find({
    property_id: new Types.ObjectId(propertyId),
    status: ReceptionistStatus.ACTIVE,
  });
};

ReceptionistSchema.statics.findByShiftType = function (
  this: Model<ReceptionistDocument>,
  shiftType: ReceptionistShiftType,
) {
  return this.find({
    shift_type: shiftType,
    status: ReceptionistStatus.ACTIVE,
  });
};

ReceptionistSchema.statics.findActive = function (
  this: Model<ReceptionistDocument>,
) {
  return this.find({
    status: ReceptionistStatus.ACTIVE,
  }).sort({ created_at: -1 });
};

ReceptionistSchema.statics.findOnDuty = function (
  this: Model<ReceptionistDocument>,
) {
  const now = new Date();
  return this.find({
    status: ReceptionistStatus.ACTIVE,
    last_shift_start: { $lte: now },
    last_shift_end: { $gte: now },
  });
};

ReceptionistSchema.statics.findAvailable = function (
  this: Model<ReceptionistDocument>,
) {
  return this.find({
    status: ReceptionistStatus.ACTIVE,
    $or: [{ last_shift_end: { $lt: new Date() } }, { last_shift_end: null }],
  });
};

ReceptionistSchema.statics.findTopPerformers = function (
  this: Model<ReceptionistDocument>,
  limit: number = 10,
) {
  return this.find({
    status: ReceptionistStatus.ACTIVE,
    satisfaction_score: { $ne: null },
  })
    .sort({ satisfaction_score: -1, reservations_processed: -1 })
    .limit(limit);
};

ReceptionistSchema.statics.findByEmployeeCode = function (
  this: Model<ReceptionistDocument>,
  employeeCode: string,
) {
  return this.findOne({ employee_code: employeeCode });
};

ReceptionistSchema.statics.getStats = function (
  this: Model<ReceptionistDocument>,
  propertyId?: string,
) {
  const match: Record<string, unknown> = {
    status: ReceptionistStatus.ACTIVE,
  };
  if (propertyId) {
    match.property_id = new Types.ObjectId(propertyId);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$property_id',
        total_receptionists: { $sum: 1 },
        avg_satisfaction: { $avg: '$satisfaction_score' },
        total_reservations: { $sum: '$reservations_processed' },
        avg_handling_time: { $avg: '$avg_handling_time' },
        total_checkins: { $sum: '$total_checkins' },
        total_checkouts: { $sum: '$total_checkouts' },
      },
    },
    {
      $lookup: {
        from: 'properties',
        localField: '_id',
        foreignField: '_id',
        as: 'property',
      },
    },
    {
      $unwind: {
        path: '$property',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        property_name: '$property.name',
        total_receptionists: 1,
        avg_satisfaction: 1,
        total_reservations: 1,
        avg_handling_time: 1,
        total_checkins: 1,
        total_checkouts: 1,
      },
    },
  ]);
};
