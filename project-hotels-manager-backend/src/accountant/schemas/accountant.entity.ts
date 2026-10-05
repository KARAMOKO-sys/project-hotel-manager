// src/accountant/schemas/accountant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type AccountantDocument = Accountant & Document;

@Schema({
  timestamps: true,
  collection: 'accountants',
  discriminatorKey: 'userType',
})
export class Accountant extends User {
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
    type: String,
    required: false,
    maxlength: 100,
  })
  certification?: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_create_invoices!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  can_process_refunds!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  can_export_reports!: boolean;

  @Prop({
    type: Number,
    default: 5000,
    min: 0,
    max: 99999999.99,
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
  certifications?: string[];

  @Prop({
    type: Object,
    default: {},
  })
  preferences?: Record<string, any>;

  // Implémentation des méthodes
  getUserType(): string {
    return 'accountant';
  }

  getDashboardRoute(): string {
    return '/accounting/dashboard';
  }

  getPermissions(): string[] {
    return [
      'invoices:create',
      'invoices:read',
      'invoices:update',
      'payments:process',
      'reports:export',
      'taxes:view',
      'financial:analyze',
      'audit:view',
    ];
  }

  // Méthodes supplémentaires spécifiques aux comptables
  canProcessPayment(amount: number): boolean {
    return amount <= this.approval_limit;
  }

  getFullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  isActive(): boolean {
    return this.status === 'active';
  }
}

export const AccountantSchema = SchemaFactory.createForClass(Accountant);

// Ajout des index supplémentaires
AccountantSchema.index({ property_id: 1, employee_code: 1 });
AccountantSchema.index({ status: 1 });
AccountantSchema.index({ certification: 1 });
AccountantSchema.index({ 'preferences.notification': 1 });

// Middleware pre-save
/*
AccountantSchema.pre('save', function (next) {
  // Validation du code employé
  if (this.employee_code && this.employee_code.length > 50) {
    next(new Error('Employee code cannot exceed 50 characters'));
  }

  // Validation du montant
  if (this.approval_limit < 0) {
    next(new Error('Approval limit cannot be negative'));
  }

  next();
});
*/

// Méthode statique pour trouver les comptables par propriété
AccountantSchema.statics.findByProperty = function (
  propertyId: Types.ObjectId,
) {
  return this.find({ property_id: propertyId, status: 'active' });
};

// Méthode statique pour trouver les comptables avec leurs permissions
/*
AccountantSchema.statics.findWithPermissions = function () {
  return this.find({ status: 'active' }).select(
    '+can_create_invoices +can_process_refunds +can_export_reports',
  );
};
*/
