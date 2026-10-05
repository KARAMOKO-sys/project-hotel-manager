// src/partner/schemas/partner.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type PartnerDocument = Partner & Document;

export enum PartnerType {
  REAL_ESTATE_AGENCY = 'real_estate_agency',
  PROPERTY_OWNER = 'property_owner',
  PROPERTY_MANAGER = 'property_manager',
  DEVELOPER = 'developer',
  INVESTMENT_FUND = 'investment_fund',
  CONSTRUCTION_COMPANY = 'construction_company',
  INTERIOR_DESIGNER = 'interior_designer',
}

export enum PartnerStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
  REJECTED = 'rejected',
}

@Schema({
  timestamps: true,
  collection: 'partners',
  discriminatorKey: 'userType',
})
export class Partner extends User {
  @Prop({
    type: String,
    required: true,
    maxlength: 255,
    trim: true,
    index: true,
  })
  company_name!: string;

  @Prop({
    type: String,
    enum: Object.values(PartnerType),
    required: true,
    index: true,
  })
  partner_type!: PartnerType;

  @Prop({
    type: String,
    enum: Object.values(PartnerStatus),
    default: PartnerStatus.PENDING,
    index: true,
  })
  partner_status!: PartnerStatus;

  @Prop({
    type: Number,
    default: 10.0,
    min: 0,
    max: 100,
  })
  commission_rate!: number;

  @Prop({
    type: Number,
    default: 10,
    min: 0,
    max: 999,
  })
  max_properties!: number;

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  company_registration?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  tax_id?: string;

  @Prop({
    type: String,
    required: false,
  })
  company_logo_url?: string;

  @Prop({
    type: String,
    required: false,
  })
  company_website?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 255,
  })
  contact_name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  contact_phone?: string;

  @Prop({
    type: String,
    required: false,
  })
  contact_email?: string;

  /*
 @Prop({
   type: {
     street: { type: String, maxlength: 255 },
     city: { type: String, maxlength: 100 },
     state: { type: String, maxlength: 100 },
     country: { type: String, maxlength: 100 },
     postal_code: { type: String, maxlength: 20 },
   },
   required: false,
   default: {},
 })
 address?: {
   street?: string;
   city?: string;
   state?: string;
   country?: string;
   postal_code?: string;
 };
 */

  @Prop({
    type: String,
    required: false,
  })
  registration_document_url?: string;

  @Prop({
    type: String,
    required: false,
  })
  tax_document_url?: string;

  @Prop({
    type: String,
    required: false,
  })
  contract_document_url?: string;

  @Prop({
    type: Date,
    required: false,
  })
  contract_signed_at?: Date;

  @Prop({
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'per_transaction'],
    default: 'monthly',
  })
  commission_payment_method?: string;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  max_listings_per_month?: number;

  @Prop({
    type: {
      account_name: { type: String, maxlength: 255 },
      account_number: { type: String, maxlength: 100 },
      bank_name: { type: String, maxlength: 255 },
      bank_code: { type: String, maxlength: 50 },
      swift_code: { type: String, maxlength: 50 },
    },
    required: false,
  })
  bank_account?: {
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    bank_code?: string;
    swift_code?: string;
  };

  @Prop({
    type: [String],
    default: [],
  })
  certifications?: string[];

  @Prop({
    type: [String],
    default: [],
  })
  specializations?: string[];

  /*
  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
  */

  @Prop({
    type: Date,
    required: false,
  })
  verified_at?: Date;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  verified_by?: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
  })
  rejection_reason?: string;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_properties_listed?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_bookings?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_commission_earned?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  rating?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_reviews?: number;

  @Prop({
    type: [String],
    default: [],
  })
  property_ids?: Types.ObjectId[];

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'partner';
  }

  getDashboardRoute(): string {
    return '/partner/dashboard';
  }

  getPermissions(): string[] {
    const permissions = [
      'properties:create',
      'properties:read',
      'properties:update',
      'bookings:read',
      'invoices:view',
      'reports:view',
    ];

    if (this.partner_status === PartnerStatus.ACTIVE) {
      permissions.push(
        'properties:delete',
        'bookings:create',
        'commission:view',
      );
    }

    return permissions;
  }

  // Méthodes spécifiques aux partenaires
  getCompanyName(): string {
    return this.company_name;
  }

  getPartnerTypeLabel(): string {
    const labels = {
      [PartnerType.REAL_ESTATE_AGENCY]: 'Agence Immobilière',
      [PartnerType.PROPERTY_OWNER]: 'Propriétaire',
      [PartnerType.PROPERTY_MANAGER]: 'Gestionnaire de Biens',
      [PartnerType.DEVELOPER]: 'Promoteur Immobilier',
      [PartnerType.INVESTMENT_FUND]: "Fonds d'Investissement",
      [PartnerType.CONSTRUCTION_COMPANY]: 'Entreprise de Construction',
      [PartnerType.INTERIOR_DESIGNER]: "Designer d'Intérieur",
    };
    return labels[this.partner_type] || this.partner_type;
  }

  getStatusLabel(): string {
    const labels = {
      [PartnerStatus.PENDING]: 'En Attente',
      [PartnerStatus.ACTIVE]: 'Actif',
      [PartnerStatus.SUSPENDED]: 'Suspendu',
      [PartnerStatus.BLOCKED]: 'Bloqué',
      [PartnerStatus.INACTIVE]: 'Inactif',
      [PartnerStatus.REJECTED]: 'Rejeté',
    };
    return labels[this.partner_status] || this.partner_status;
  }

  isActive(): boolean {
    return this.partner_status === PartnerStatus.ACTIVE;
  }

  isPending(): boolean {
    return this.partner_status === PartnerStatus.PENDING;
  }

  isSuspended(): boolean {
    return this.partner_status === PartnerStatus.SUSPENDED;
  }

  isBlocked(): boolean {
    return this.partner_status === PartnerStatus.BLOCKED;
  }

  canListProperties(): boolean {
    return (
      this.isActive() &&
      (this.total_properties_listed || 0) < this.max_properties
    );
  }

  canAddProperty(): boolean {
    return (
      this.canListProperties() && this.partner_status === PartnerStatus.ACTIVE
    );
  }

  hasMaxPropertiesReached(): boolean {
    return (this.total_properties_listed || 0) >= this.max_properties;
  }

  getRemainingPropertySlots(): number {
    return Math.max(
      0,
      this.max_properties - (this.total_properties_listed || 0),
    );
  }

  calculateCommission(amount: number): number {
    return (amount * this.commission_rate) / 100;
  }

  getFullContact(): string {
    return this.contact_name || `${this.first_name} ${this.last_name}`;
  }

  getContactInfo(): { name: string; email: string; phone: string } {
    return {
      name: this.getFullContact(),
      email: this.contact_email || this.email,
      phone: this.contact_phone || this.phone || '',
    };
  }

  hasBankAccount(): boolean {
    return !!(this.bank_account && this.bank_account.account_number);
  }
  /*
  getFormattedAddress(): string {
    if (!this.address) return '';
    const parts = [
      this.address.street,
      this.address.city,
      this.address.state,
      this.address.postal_code,
      this.address.country,
    ].filter((part) => part && part.trim().length > 0);
    return parts.join(', ');
  }
  */

  incrementPropertiesListed(): void {
    this.total_properties_listed = (this.total_properties_listed || 0) + 1;
  }

  decrementPropertiesListed(): void {
    this.total_properties_listed = Math.max(
      0,
      (this.total_properties_listed || 0) - 1,
    );
  }

  incrementBookings(): void {
    this.total_bookings = (this.total_bookings || 0) + 1;
  }

  addCommission(amount: number): void {
    this.total_commission_earned = (this.total_commission_earned || 0) + amount;
  }

  updateRating(newRating: number): void {
    if (newRating < 0 || newRating > 5) return;

    if (this.rating) {
      this.rating =
        (this.rating * (this.total_reviews || 0) + newRating) /
        ((this.total_reviews || 0) + 1);
    } else {
      this.rating = newRating;
    }
    this.total_reviews = (this.total_reviews || 0) + 1;
  }

  // Méthodes de validation
  isValid(): boolean {
    return (
      !!this.company_name &&
      !!this.partner_type &&
      this.commission_rate >= 0 &&
      this.commission_rate <= 100 &&
      this.max_properties >= 0
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

export const PartnerSchema = SchemaFactory.createForClass(Partner);

// Ajout des index supplémentaires
PartnerSchema.index({ company_name: 1 });
PartnerSchema.index({ partner_type: 1, partner_status: 1 });
PartnerSchema.index({ commission_rate: 1 });
PartnerSchema.index({ 'address.city': 1 });
PartnerSchema.index({ 'address.country': 1 });
PartnerSchema.index({ total_properties_listed: -1 });
PartnerSchema.index({ rating: -1 });
PartnerSchema.index({ created_at: -1 });

// Middleware pre-save
/*
PartnerSchema.pre('save', function (next) {
  // Validation du nom de l'entreprise
  if (!this.company_name || this.company_name.trim().length === 0) {
    next(new Error('Company name is required'));
  }

  // Validation du type de partenaire
  if (!Object.values(PartnerType).includes(this.partner_type)) {
    next(new Error('Invalid partner type'));
  }

  // Validation du taux de commission
  if (this.commission_rate < 0 || this.commission_rate > 100) {
    next(new Error('Commission rate must be between 0 and 100'));
  }

  // Validation du nombre maximum de propriétés
  if (this.max_properties < 0) {
    next(new Error('Max properties cannot be negative'));
  }

  // Nettoyer les champs
  if (this.company_name) {
    this.company_name = this.company_name.trim();
  }

  // Mettre à jour le statut si nécessaire
  if (this.isActive() && !this.verified_at) {
    this.verified_at = new Date();
  }

  next();
});
*/

// Middleware post-save pour l'audit
/*
PartnerSchema.post('save', function (doc) {
  console.log(
    `Partner ${doc.company_name} (${doc.email}) saved at ${new Date()}`,
  );
});
*/

// Méthodes statiques
PartnerSchema.statics.findByType = function (partnerType: PartnerType) {
  return this.find({
    partner_type: partnerType,
    partner_status: PartnerStatus.ACTIVE,
  });
};

/*
PartnerSchema.statics.findActive = function () {
  return this.find({
    partner_status: PartnerStatus.ACTIVE,
  }).sort({ rating: -1 });
};

PartnerSchema.statics.findPending = function () {
  return this.find({
    partner_status: PartnerStatus.PENDING,
  }).sort({ created_at: 1 });
};
*/

PartnerSchema.statics.findByStatus = function (status: PartnerStatus) {
  return this.find({ partner_status: status });
};

PartnerSchema.statics.findByCompanyName = function (companyName: string) {
  return this.findOne({
    company_name: { $regex: companyName, $options: 'i' },
  });
};

/*
PartnerSchema.statics.findTopRated = function (limit: number = 10) {
  return this.find({
    partner_status: PartnerStatus.ACTIVE,
    rating: { $ne: null },
  })
    .sort({ rating: -1 })
    .limit(limit);
};

*/
PartnerSchema.statics.findWithAvailableProperties = function () {
  return this.find({
    partner_status: PartnerStatus.ACTIVE,
    $expr: {
      $lt: ['$total_properties_listed', '$max_properties'],
    },
  });
};

PartnerSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        by_type: [
          {
            $group: {
              _id: '$partner_type',
              count: { $sum: 1 },
            },
          },
        ],
        by_status: [
          {
            $group: {
              _id: '$partner_status',
              count: { $sum: 1 },
            },
          },
        ],
        active: [
          { $match: { partner_status: PartnerStatus.ACTIVE } },
          { $count: 'count' },
        ],
        pending: [
          { $match: { partner_status: PartnerStatus.PENDING } },
          { $count: 'count' },
        ],
        avg_commission: [
          {
            $group: {
              _id: null,
              avg: { $avg: '$commission_rate' },
            },
          },
        ],
        total_properties: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total_properties_listed' },
            },
          },
        ],
      },
    },
  ]);
};

PartnerSchema.statics.getPropertyDistribution = function () {
  return this.aggregate([
    {
      $match: { partner_status: PartnerStatus.ACTIVE },
    },
    {
      $group: {
        _id: '$partner_type',
        partners: { $sum: 1 },
        total_properties: { $sum: '$total_properties_listed' },
        avg_properties: { $avg: '$total_properties_listed' },
        avg_commission: { $avg: '$commission_rate' },
      },
    },
    {
      $sort: { total_properties: -1 },
    },
  ]);
};
