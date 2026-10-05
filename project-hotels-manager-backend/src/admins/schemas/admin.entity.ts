// src/super-admin/schemas/super-admin.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type SuperAdminDocument = SuperAdmin & Document;

@Schema({
  timestamps: true,
  collection: 'super_admins',
  discriminatorKey: 'userType',
})
export class SuperAdmin extends User {
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    index: true,
  })
  employee_id?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  department?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  position?: string;

  @Prop({
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  })
  access_level!: number;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_manage_system!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_manage_users!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_view_all_orgs!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  receive_system_alerts!: boolean;

  @Prop({
    type: String,
    required: false,
    maxlength: 255,
  })
  alert_email?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  alert_phone?: string;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 999999999999.99,
  })
  approval_limit!: number;

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status?: string;

  @Prop({
    type: Date,
    required: false,
  })
  hire_date?: Date;

  @Prop({
    type: [String],
    default: [],
  })
  managed_departments?: string[];

  @Prop({
    type: Object,
    default: {},
  })
  system_preferences?: Record<string, any>;

  @Prop({
    type: [String],
    default: [],
  })
  ip_whitelist?: string[];

  @Prop({
    type: Boolean,
    default: false,
  })
  mfa_required?: boolean;

  @Prop({
    type: Date,
    required: false,
  })
  last_audit_at?: Date;

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'super_admin';
  }

  getDashboardRoute(): string {
    return '/admin/dashboard';
  }

  getPermissions(): string[] {
    return ['*'];
  }

  // Méthodes spécifiques aux Super Admin
  hasFullAccess(): boolean {
    return this.access_level === 5;
  }

  canApproveAmount(amount: number): boolean {
    return this.approval_limit === 0 || amount <= this.approval_limit;
  }

  getManagedDepartments(): string[] {
    return this.managed_departments || [];
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isInWhitelist(ip: string): boolean {
    if (!this.ip_whitelist || this.ip_whitelist.length === 0) return true;
    return this.ip_whitelist.includes(ip);
  }

  getAlertContact(): { email?: string; phone?: string } {
    return {
      email: this.alert_email || this.email,
      phone: this.alert_phone || this.phone,
    };
  }
}

export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);

// Ajout des index supplémentaires
SuperAdminSchema.index({ employee_id: 1 }, { unique: true, sparse: true });
SuperAdminSchema.index({ status: 1 });
SuperAdminSchema.index({ access_level: 1 });
SuperAdminSchema.index({ department: 1 });
SuperAdminSchema.index({ 'system_preferences.notifications': 1 });

// Middleware pre-save
SuperAdminSchema.pre('save', function (next) {
  // Validation du niveau d'accès
  /*
  if (this.access_level < 1 || this.access_level > 5) {
    next(new Error('Access level must be between 1 and 5'));
  }

  // Validation du montant d'approbation
  if (this.approval_limit < 0) {
    next(new Error('Approval limit cannot be negative'));
  }
  next();

  */

  // Forcer l'email d'alerte si non défini
  if (!this.alert_email && this.email) {
    this.alert_email = this.email;
  }
});

// Middleware post-save pour l'audit
SuperAdminSchema.post('save', function (doc) {
  // Log des modifications pour audit
  console.log(`SuperAdmin ${doc.email} has been saved at ${new Date()}`);
});

// Méthodes statiques
SuperAdminSchema.statics.findByDepartment = function (department: string) {
  return this.find({
    department: department,
    status: 'active',
  });
};

/*
SuperAdminSchema.statics.findActiveAdmins = function () {
  return this.find({
    status: 'active',
  }).sort({ access_level: -1 });
};
*/

SuperAdminSchema.statics.findByAccessLevel = function (level: number) {
  return this.find({
    access_level: { $gte: level },
    status: 'active',
  });
};

SuperAdminSchema.statics.findWithApprovalLimit = function (minAmount: number) {
  return this.find({
    $or: [{ approval_limit: 0 }, { approval_limit: { $gte: minAmount } }],
    status: 'active',
  });
};
