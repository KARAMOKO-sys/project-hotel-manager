// src/housekeeping-staff/schemas/housekeeping-staff.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type HousekeepingStaffDocument = HousekeepingStaff & Document;

export enum HousekeepingStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave',
  SICK = 'sick',
  TRAINING = 'training',
  SUSPENDED = 'suspended',
}

export enum SpecializationType {
  ROOMS = 'rooms',
  PUBLIC_AREAS = 'public_areas',
  DEEP_CLEANING = 'deep_cleaning',
  WINDOW_CLEANING = 'window_cleaning',
  CARPET_CLEANING = 'carpet_cleaning',
  LAUNDRY = 'laundry',
  LINEN = 'linen',
}

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
  FLEXIBLE = 'flexible',
}

@Schema({
  timestamps: true,
  collection: 'housekeeping_staff',
  discriminatorKey: 'userType',
})
export class HousekeepingStaff extends User {
  @Prop({
    type: Types.ObjectId,
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
    trim: true,
  })
  specialization?: string;

  @Prop({
    type: String,
    required: false,
  })
  shift_start?: string;

  @Prop({
    type: String,
    required: false,
  })
  shift_end?: string;

  @Prop({
    type: [String],
    required: false,
    default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  })
  working_days?: string[];

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  rooms_cleaned_today!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  rooms_cleaned_total!: number;

  @Prop({
    type: Number,
    required: false,
    min: 0,
  })
  avg_cleaning_time?: number; // en minutes

  @Prop({
    type: Number,
    required: false,
    min: 0,
    max: 5,
  })
  quality_score?: number;

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  assigned_equipment?: {
    vacuum_cleaner?: boolean;
    mop?: boolean;
    cleaning_cart?: boolean;
    linen_cart?: boolean;
    chemicals?: string[];
    other?: string[];
  };

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    enum: Object.values(HousekeepingStatus),
    default: HousekeepingStatus.ACTIVE,
  })
  status?: HousekeepingStatus;

  @Prop({
    type: String,
    enum: Object.values(ShiftType),
    default: ShiftType.FLEXIBLE,
  })
  shift_type?: ShiftType;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  supervisor_name?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  supervisor_id?: Types.ObjectId;

  @Prop({
    type: [String],
    default: [],
  })
  skills?: string[];

  @Prop({
    type: [String],
    default: [],
  })
  certifications?: string[];

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_tasks_completed?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_issue_reports?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_extra_hours?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  })
  attendance_rate?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  monthly_target?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  monthly_completed?: number;

  @Prop({
    type: [
      {
        date: { type: Date },
        room_id: { type: Types.ObjectId },
        room_number: { type: String },
        cleaning_time: { type: Number }, // en minutes
        quality_score: { type: Number },
        issue_reported: { type: Boolean },
        notes: { type: String },
      },
    ],
    default: [],
  })
  cleaning_history?: Array<{
    date: Date;
    room_id: Types.ObjectId;
    room_number: string;
    cleaning_time: number;
    quality_score: number;
    issue_reported: boolean;
    notes?: string;
  }>;

  @Prop({
    type: Object,
    default: {},
  })
  preferences?: {
    notifications?: boolean;
    language?: string;
    theme?: string;
    mobile_app?: boolean;
    shift_preferences?: string[];
  };

  @Prop({
    type: Object,
    default: {},
  })
  performance_metrics?: {
    avg_time_per_room?: number;
    quality_trend?: 'improving' | 'stable' | 'declining';
    completion_rate?: number;
    total_overtime?: number;
    total_leave_taken?: number;
    rating?: number;
  };

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'housekeeping';
  }

  getDashboardRoute(): string {
    return '/housekeeping/tasks';
  }

  getPermissions(): string[] {
    const permissions = [
      'rooms:update_status',
      'tasks:read',
      'tasks:update',
      'maintenance:report',
    ];

    if (this.status === HousekeepingStatus.ACTIVE) {
      permissions.push('rooms:view_details', 'tasks:complete');
    }

    return permissions;
  }

  // Méthodes spécifiques au personnel de ménage
  getFullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  getEmployeeDisplay(): string {
    return `${this.employee_code} - ${this.getFullName()}`;
  }

  /*
 getStatusLabel(): string {
   const labels = {
     [HousekeepingStatus.ACTIVE]: 'Actif',
     [HousekeepingStatus.INACTIVE]: 'Inactif',
     [HousekeepingStatus.ON_LEAVE]: 'En Congé',
     [HousekeepingStatus.SICK]: 'Malade',
     [HousekeepingStatus.TRAINING]: 'En Formation',
     [HousekeepingStatus.SUSPENDED]: 'Suspendu',
   };
   return labels[this.status] || this.status;
 }

 getSpecializationLabel(): string {
   const labels = {
     [SpecializationType.ROOMS]: 'Chambres',
     [SpecializationType.PUBLIC_AREAS]: 'Espaces Publics',
     [SpecializationType.DEEP_CLEANING]: 'Nettoyage Approfondi',
     [SpecializationType.WINDOW_CLEANING]: 'Nettoyage des Vitres',
     [SpecializationType.CARPET_CLEANING]: 'Nettoyage des Tapis',
     [SpecializationType.LAUNDRY]: 'Blanchisserie',
     [SpecializationType.LINEN]: 'Linge',
   };
   return labels[this.specialization] || this.specialization || 'Général';
 }
 */

  isActive(): boolean {
    return this.status === HousekeepingStatus.ACTIVE;
  }

  /*
  isOnDuty(): boolean {
    if (!this.shift_start || !this.shift_end) return false;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= this.shift_start && currentTime <= this.shift_end;
  }

  isWorkingDay(date: Date): boolean {
    if (!this.working_days || this.working_days.length === 0) return true;
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const dayName = days[date.getDay()];
    return this.working_days.includes(dayName);
  }

  canCleanRoom(): boolean {
    return this.isActive() && this.isOnDuty() && this.isWorkingDay(new Date());
  }

  */

  incrementRoomsCleaned(): void {
    this.rooms_cleaned_today = (this.rooms_cleaned_today || 0) + 1;
    this.rooms_cleaned_total = (this.rooms_cleaned_total || 0) + 1;
    this.total_tasks_completed = (this.total_tasks_completed || 0) + 1;
    this.monthly_completed = (this.monthly_completed || 0) + 1;
  }

  resetDailyCount(): void {
    this.rooms_cleaned_today = 0;
  }

  addCleaningRecord(record: {
    room_id: Types.ObjectId;
    room_number: string;
    cleaning_time: number;
    quality_score?: number;
    issue_reported?: boolean;
    notes?: string;
  }): void {
    if (!this.cleaning_history) {
      this.cleaning_history = [];
    }

    this.cleaning_history.push({
      date: new Date(),
      room_id: record.room_id,
      room_number: record.room_number,
      cleaning_time: record.cleaning_time,
      quality_score: record.quality_score || 5,
      issue_reported: record.issue_reported || false,
      notes: record.notes,
    });

    this.incrementRoomsCleaned();

    // Mettre à jour le temps moyen de nettoyage
    if (this.avg_cleaning_time) {
      this.avg_cleaning_time =
        (this.avg_cleaning_time + record.cleaning_time) / 2;
    } else {
      this.avg_cleaning_time = record.cleaning_time;
    }

    // Mettre à jour le score de qualité
    if (record.quality_score) {
      this.updateQualityScore(record.quality_score);
    }
  }

  updateQualityScore(score: number): void {
    if (score < 0 || score > 5) return;

    if (this.quality_score) {
      this.quality_score = (this.quality_score + score) / 2;
    } else {
      this.quality_score = score;
    }
  }

  getCleaningStats(): {
    total_rooms: number;
    today_rooms: number;
    avg_time: number | null;
    quality_score: number | null;
    completion_rate: number | null;
  } {
    return {
      total_rooms: this.rooms_cleaned_total || 0,
      today_rooms: this.rooms_cleaned_today || 0,
      avg_time: this.avg_cleaning_time || null,
      quality_score: this.quality_score || null,
      completion_rate: this.performance_metrics?.completion_rate || null,
    };
  }

  getTodayTasks(): Array<{
    room_number: string;
    time: number;
    quality: number;
  }> {
    if (!this.cleaning_history) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.cleaning_history
      .filter((record) => new Date(record.date) >= today)
      .map((record) => ({
        room_number: record.room_number,
        time: record.cleaning_time,
        quality: record.quality_score,
      }));
  }

  getPerformanceSummary(): {
    totalTasks: number;
    avgQuality: number | null;
    avgTime: number | null;
    attendance: number | null;
    monthlyProgress: number;
  } {
    const monthlyProgress =
      this.monthly_target && this.monthly_target > 0
        ? ((this.monthly_completed || 0) / this.monthly_target) * 100
        : 0;

    return {
      totalTasks: this.total_tasks_completed || 0,
      avgQuality: this.quality_score || null,
      avgTime: this.avg_cleaning_time || null,
      attendance: this.attendance_rate || null,
      monthlyProgress: Math.min(100, monthlyProgress),
    };
  }

  setStatus(status: HousekeepingStatus): void {
    this.status = status;
  }

  startShift(): void {
    this.status = HousekeepingStatus.ACTIVE;
  }

  endShift(): void {
    this.resetDailyCount();
  }

  /*
 isAvailable(): boolean {
   return this.isActive() && this.isOnDuty();
 }

 assignEquipment(equipment: any): void {
   this.assigned_equipment = {
     ...this.assigned_equipment,
     ...equipment,
   };
 }
 */

  reportIssue(issue: {
    room_id: Types.ObjectId;
    room_number: string;
    issue_type: string;
    description: string;
  }): void {
    this.total_issue_reports = (this.total_issue_reports || 0) + 1;
    // Logique supplémentaire pour enregistrer l'issue
    console.log(
      `Issue reported: ${issue.issue_type} in room ${issue.room_number}`,
    );
  }

  // Méthodes de validation
  isValid(): boolean {
    return !!(
      this.first_name &&
      this.last_name &&
      this.email &&
      this.employee_code &&
      this.property_id
    );
  }

  /*
  toJSON(): any {
    const obj = super.toJSON ? super.toJSON() : this;
    // Exclure les données sensibles
    delete obj.password_hash;
    return obj;
  }
  */
}

export const HousekeepingStaffSchema =
  SchemaFactory.createForClass(HousekeepingStaff);

// Ajout des index supplémentaires
HousekeepingStaffSchema.index({ property_id: 1, employee_code: 1 });
HousekeepingStaffSchema.index({ status: 1 });
HousekeepingStaffSchema.index({ specialization: 1 });
HousekeepingStaffSchema.index({ shift_type: 1 });
HousekeepingStaffSchema.index({ working_days: 1 });
HousekeepingStaffSchema.index({ rooms_cleaned_total: -1 });
HousekeepingStaffSchema.index({ quality_score: -1 });
HousekeepingStaffSchema.index({ 'cleaning_history.date': -1 });

/*
// Middleware pre-save
HousekeepingStaffSchema.pre('save', function (next) {
  // Validation du code employé
  if (this.employee_code && this.employee_code.length > 50) {
    next(new Error('Employee code cannot exceed 50 characters'));
  }

  // Validation du score de qualité
  if (
    this.quality_score &&
    (this.quality_score < 0 || this.quality_score > 5)
  ) {
    next(new Error('Quality score must be between 0 and 5'));
  }

  // Validation des jours de travail
  if (this.working_days) {
    const validDays = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const invalidDays = this.working_days.filter(
      (day) => !validDays.includes(day),
    );
    if (invalidDays.length > 0) {
      next(new Error(`Invalid working days: ${invalidDays.join(', ')}`));
    }
  }

  // Validation des horaires
  if (this.shift_start && this.shift_end) {
    if (this.shift_start >= this.shift_end) {
      next(new Error('Shift start must be before shift end'));
    }
  }

  next();
});

// Middleware post-save pour l'audit
HousekeepingStaffSchema.post('save', function (doc) {
  console.log(
    `Housekeeping staff ${doc.employee_code} (${doc.email}) saved at ${new Date()}`,
  );
});
*/

// Méthodes statiques
HousekeepingStaffSchema.statics.findByProperty = function (propertyId: string) {
  return this.find({
    property_id: new Types.ObjectId(propertyId),
    status: HousekeepingStatus.ACTIVE,
  });
};

HousekeepingStaffSchema.statics.findBySpecialization = function (
  specialization: string,
) {
  return this.find({
    specialization: specialization,
    status: HousekeepingStatus.ACTIVE,
  });
};

HousekeepingStaffSchema.statics.findActive = function () {
  return this.find({
    status: HousekeepingStatus.ACTIVE,
  }).sort({ quality_score: -1 });
};

HousekeepingStaffSchema.statics.findOnDuty = function () {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);

  return this.find({
    status: HousekeepingStatus.ACTIVE,
    shift_start: { $lte: currentTime },
    shift_end: { $gte: currentTime },
  });
};

HousekeepingStaffSchema.statics.findAvailable = function () {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  const today = days[now.getDay()];

  return this.find({
    status: HousekeepingStatus.ACTIVE,
    shift_start: { $lte: currentTime },
    shift_end: { $gte: currentTime },
    working_days: { $in: [today] },
  });
};

/*
HousekeepingStaffSchema.statics.findTopPerformers = function (
  limit: number = 10,
) {
  return this.find({
    status: HousekeepingStatus.ACTIVE,
    quality_score: { $ne: null },
  })
    .sort({ quality_score: -1, rooms_cleaned_total: -1 })
    .limit(limit);
};
*/

HousekeepingStaffSchema.statics.findByEmployeeCode = function (
  employeeCode: string,
) {
  return this.findOne({ employee_code: employeeCode });
};

/*
HousekeepingStaffSchema.statics.getStats = function (propertyId?: string) {
  const match: any = { status: HousekeepingStatus.ACTIVE };
  if (propertyId) {
    match.property_id = new Types.ObjectId(propertyId);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$property_id',
        total_staff: { $sum: 1 },
        avg_quality: { $avg: '$quality_score' },
        total_rooms: { $sum: '$rooms_cleaned_total' },
        avg_time: { $avg: '$avg_cleaning_time' },
        total_tasks: { $sum: '$total_tasks_completed' },
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
        total_staff: 1,
        avg_quality: 1,
        total_rooms: 1,
        avg_time: 1,
        total_tasks: 1,
      },
    },
  ]);
};

HousekeepingStaffSchema.statics.getDailyStats = function (propertyId?: string) {
  const match: any = { status: HousekeepingStatus.ACTIVE };
  if (propertyId) {
    match.property_id = new Types.ObjectId(propertyId);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.aggregate([
    { $match: match },
    {
      $project: {
        employee_code: 1,
        first_name: 1,
        last_name: 1,
        rooms_cleaned_today: 1,
        today_tasks: {
          $filter: {
            input: '$cleaning_history',
            as: 'task',
            cond: { $gte: ['$$task.date', today] },
          },
        },
      },
    },
    {
      $project: {
        employee_code: 1,
        full_name: { $concat: ['$first_name', ' ', '$last_name'] },
        rooms_cleaned_today: 1,
        tasks_today: { $size: '$today_tasks' },
        avg_time_today: { $avg: '$today_tasks.cleaning_time' },
        avg_quality_today: { $avg: '$today_tasks.quality_score' },
      },
    },
    {
      $sort: { rooms_cleaned_today: -1 },
    },
  ]);
};
*/
