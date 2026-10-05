// src/owner/schemas/owner.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type OwnerDocument = Owner & Document;

export enum OwnerSubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  TRIAL = 'trial',
}

export enum OwnerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum IdentificationType {
  PASSPORT = 'passport',
  NATIONAL_ID = 'national_id',
  DRIVER_LICENSE = 'driver_license',
  COMPANY_REGISTRATION = 'company_registration',
}

@Schema({
  timestamps: true,
  collection: 'owners',
  discriminatorKey: 'userType',
})
export class Owner extends User {
  // Informations de l'entreprise
  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    trim: true,
    index: true,
  })
  company_name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  company_registration?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  tax_id?: string;

  // Informations personnelles
  @Prop({
    type: Date,
    required: false,
  })
  birth_date?: Date;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  nationality?: string;

  @Prop({
    type: String,
    required: false,
    enum: Object.values(IdentificationType),
  })
  id_type?: IdentificationType;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  id_number?: string;

  @Prop({
    type: String,
    required: false,
  })
  id_document_url?: string;

  // Adresse
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  city?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  state?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  country?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 20,
    trim: true,
  })
  postal_code?: string;

  // Contact d'urgence
  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    trim: true,
  })
  emergency_contact_name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 50,
    trim: true,
  })
  emergency_contact_phone?: string;

  // Contrat
  @Prop({
    type: Date,
    required: false,
  })
  contract_signed_at?: Date;

  @Prop({
    type: String,
    required: false,
  })
  contract_document_url?: string;

  // Abonnement
  @Prop({
    type: Number,
    default: 1,
    min: 0,
    max: 999,
  })
  max_properties!: number;

  @Prop({
    type: String,
    enum: Object.values(OwnerSubscriptionPlan),
    default: OwnerSubscriptionPlan.BASIC,
  })
  subscription_plan!: OwnerSubscriptionPlan;

  @Prop({
    type: Date,
    required: false,
  })
  subscription_expires_at?: Date;

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    enum: Object.values(OwnerStatus),
    default: OwnerStatus.PENDING_VERIFICATION,
  })
  owner_status?: OwnerStatus;

  @Prop({
    type: String,
    required: false,
  })
  business_license_url?: string;

  @Prop({
    type: String,
    required: false,
  })
  insurance_document_url?: string;

  @Prop({
    type: [String],
    default: [],
  })
  certifications?: string[];

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  address_details?: {
    street?: string;
    district?: string;
    landmark?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
  };

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  preferences?: {
    notifications?: boolean;
    newsletter?: boolean;
    language?: string;
    timezone?: string;
    theme?: string;
    dashboard_layout?: string;
  };

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_properties_created?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_rooms_managed?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_employees?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_revenue?: number;

  @Prop({
    type: Date,
    required: false,
  })
  last_activity_date?: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_verified?: boolean;

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
    type: [Types.ObjectId],
    ref: 'Property',
    default: [],
  })
  property_ids?: Types.ObjectId[];

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'owner';
  }

  getDashboardRoute(): string {
    return '/owner/dashboard';
  }

  getPermissions(): string[] {
    const permissions = [
      'properties:manage',
      'reservations:manage',
      'reports:view',
      'staff:manage',
      'billing:view',
    ];

    // Ajouter des permissions basées sur le statut
    if (this.owner_status === OwnerStatus.ACTIVE) {
      permissions.push(
        'properties:create',
        'properties:delete',
        'reports:export',
        'analytics:view',
      );
    }

    // Permissions basées sur le plan d'abonnement
    if (this.subscription_plan === OwnerSubscriptionPlan.PREMIUM) {
      permissions.push('promotions:create', 'email_campaigns:create');
    }

    if (this.subscription_plan === OwnerSubscriptionPlan.PROFESSIONAL) {
      permissions.push(
        'promotions:create',
        'email_campaigns:create',
        'api:access',
      );
    }

    if (this.subscription_plan === OwnerSubscriptionPlan.ENTERPRISE) {
      permissions.push(
        'promotions:create',
        'email_campaigns:create',
        'api:access',
        'whitelabel:configure',
      );
    }

    return permissions;
  }

  // Méthodes spécifiques aux propriétaires
  getCompanyDisplayName(): string {
    return this.company_name || `${this.first_name} ${this.last_name}`;
  }

  getFullAddress(): string {
    const parts = [
      this.city,
      this.state,
      this.postal_code,
      this.country,
    ].filter((part) => part && part.trim().length > 0);
    return parts.join(', ');
  }

  getFormattedAddress(): string {
    if (this.address_details?.street) {
      const parts = [
        this.address_details.street,
        this.address_details.district,
        this.city,
        this.state,
        this.country,
      ].filter((part) => part && part.trim().length > 0);
      return parts.join(', ');
    }
    return this.getFullAddress();
  }

  isActive(): boolean {
    return this.owner_status === OwnerStatus.ACTIVE && this.is_active;
  }

  isPendingVerification(): boolean {
    return this.owner_status === OwnerStatus.PENDING_VERIFICATION;
  }

  isSuspended(): boolean {
    return this.owner_status === OwnerStatus.SUSPENDED;
  }

  hasValidSubscription(): boolean {
    if (!this.subscription_expires_at) return true;
    return new Date() < this.subscription_expires_at;
  }

  canAddProperty(): boolean {
    return (
      this.isActive() &&
      this.hasValidSubscription() &&
      (this.total_properties_created || 0) < this.max_properties
    );
  }

  hasReachedPropertyLimit(): boolean {
    return (this.total_properties_created || 0) >= this.max_properties;
  }

  getRemainingPropertySlots(): number {
    return Math.max(
      0,
      this.max_properties - (this.total_properties_created || 0),
    );
  }

  getSubscriptionPlanLabel(): string {
    const labels = {
      [OwnerSubscriptionPlan.BASIC]: 'Basique',
      [OwnerSubscriptionPlan.PREMIUM]: 'Premium',
      [OwnerSubscriptionPlan.PROFESSIONAL]: 'Professionnel',
      [OwnerSubscriptionPlan.ENTERPRISE]: 'Entreprise',
      [OwnerSubscriptionPlan.TRIAL]: 'Essai Gratuit',
    };
    return labels[this.subscription_plan] || this.subscription_plan;
  }

  /*
getStatusLabel(): string {
  const labels = {
    [OwnerStatus.ACTIVE]: 'Actif',
    [OwnerStatus.INACTIVE]: 'Inactif',
    [OwnerStatus.SUSPENDED]: 'Suspendu',
    [OwnerStatus.PENDING_VERIFICATION]: 'En Attente de Vérification',
  };
  return labels[this.owner_status] || this.owner_status;
}

getIdentificationTypeLabel(): string {
  const labels = {
    [IdentificationType.PASSPORT]: 'Passeport',
    [IdentificationType.NATIONAL_ID]: "Carte d'Identité Nationale",
    [IdentificationType.DRIVER_LICENSE]: 'Permis de Conduire',
    [IdentificationType.COMPANY_REGISTRATION]: 'Registre du Commerce',
  };
  return labels[this.id_type] || this.id_type;
}
*/

  hasCompleteProfile(): boolean {
    return !!(
      this.first_name &&
      this.last_name &&
      this.email &&
      this.phone &&
      this.country &&
      this.id_type &&
      this.id_number
    );
  }

  getBusinessInfo(): {
    company_name?: string;
    company_registration?: string;
    tax_id?: string;
    business_license_url?: string;
  } {
    return {
      company_name: this.company_name,
      company_registration: this.company_registration,
      tax_id: this.tax_id,
      business_license_url: this.business_license_url,
    };
  }

  getEmergencyContact(): {
    name?: string;
    phone?: string;
  } {
    return {
      name: this.emergency_contact_name,
      phone: this.emergency_contact_phone,
    };
  }

  getIdentification(): {
    type?: string;
    number?: string;
    document_url?: string;
  } {
    return {
      type: this.id_type,
      number: this.id_number,
      document_url: this.id_document_url,
    };
  }

  incrementPropertiesCreated(): void {
    this.total_properties_created = (this.total_properties_created || 0) + 1;
  }

  decrementPropertiesCreated(): void {
    this.total_properties_created = Math.max(
      0,
      (this.total_properties_created || 0) - 1,
    );
  }

  updateLastActivity(): void {
    this.last_activity_date = new Date();
  }

  addRevenue(amount: number): void {
    this.total_revenue = (this.total_revenue || 0) + amount;
  }

  // Méthodes de validation
  isValid(): boolean {
    return !!(this.first_name && this.last_name && this.email && this.phone);
  }

  hasRequiredDocuments(): boolean {
    return !!(
      this.id_document_url &&
      (this.contract_document_url || this.business_license_url)
    );
  }
  /*
  toJSON(): any {
    const obj = super.toJSON ? super.toJSON() : this;
    // Exclure les données sensibles
    delete obj.password_hash;
    delete obj.id_number;
    return obj;
  }
  */
}

export const OwnerSchema = SchemaFactory.createForClass(Owner);

// Ajout des index supplémentaires
OwnerSchema.index({ company_name: 1 });
OwnerSchema.index({ company_registration: 1 });
OwnerSchema.index({ tax_id: 1 });
OwnerSchema.index({ owner_status: 1 });
OwnerSchema.index({ subscription_plan: 1 });
OwnerSchema.index({ subscription_expires_at: 1 });
OwnerSchema.index({ country: 1, city: 1 });
OwnerSchema.index({ total_properties_created: -1 });
OwnerSchema.index({ created_at: -1 });
OwnerSchema.index({ 'address_details.coordinates': '2dsphere' });

// Middleware pre-save
/*
OwnerSchema.pre('save', function (next) {
  // Valider les dates de naissance
  if (this.birth_date && this.birth_date > new Date()) {
    next(new Error('Birth date cannot be in the future'));
  }

  // Valider l'âge (doit avoir au moins 18 ans)
  if (this.birth_date) {
    const age = Math.floor(
      (Date.now() - this.birth_date.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
    if (age < 18) {
      next(new Error('Owner must be at least 18 years old'));
    }
  }

  // Validation du plan d'abonnement
  if (this.subscription_plan === OwnerSubscriptionPlan.TRIAL) {
    // Définir une date d'expiration par défaut pour l'essai (30 jours)
    if (!this.subscription_expires_at) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      this.subscription_expires_at = expiresAt;
    }
  }

  // Si le propriétaire devient actif, mettre à jour la date de vérification
  if (this.owner_status === OwnerStatus.ACTIVE && !this.verified_at) {
    this.verified_at = new Date();
  }

  next();
});
*/

// Middleware post-save pour l'audit
/*
OwnerSchema.post('save', function (doc) {
  console.log(
    `Owner ${doc.email} (${doc.company_name || 'Individual'}) saved at ${new Date()}`,
  );
});
*/

// Méthodes statiques
/*
OwnerSchema.statics.findActive = function () {
  return this.find({
    owner_status: OwnerStatus.ACTIVE,
    is_active: true,
  }).sort({ created_at: -1 });
};

OwnerSchema.statics.findPendingVerification = function () {
  return this.find({
    owner_status: OwnerStatus.PENDING_VERIFICATION,
  }).sort({ created_at: 1 });
};
*/

OwnerSchema.statics.findBySubscriptionPlan = function (
  plan: OwnerSubscriptionPlan,
) {
  return this.find({
    subscription_plan: plan,
    owner_status: OwnerStatus.ACTIVE,
  });
};

OwnerSchema.statics.findExpiringSubscriptions = function (days: number = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    owner_status: OwnerStatus.ACTIVE,
    subscription_expires_at: {
      $gte: new Date(),
      $lte: expiryDate,
    },
  });
};

OwnerSchema.statics.findByCountry = function (country: string) {
  return this.find({
    country: { $regex: country, $options: 'i' },
    owner_status: OwnerStatus.ACTIVE,
  });
};

OwnerSchema.statics.findByCompanyName = function (companyName: string) {
  return this.findOne({
    company_name: { $regex: companyName, $options: 'i' },
  });
};

/*
OwnerSchema.statics.findTopOwners = function (limit: number = 10) {
  return this.find({
    owner_status: OwnerStatus.ACTIVE,
    total_properties_created: { $gt: 0 },
  })
    .sort({ total_properties_created: -1, total_revenue: -1 })
    .limit(limit);
};
*/

OwnerSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        by_status: [
          {
            $group: {
              _id: '$owner_status',
              count: { $sum: 1 },
            },
          },
        ],
        by_subscription: [
          {
            $group: {
              _id: '$subscription_plan',
              count: { $sum: 1 },
            },
          },
        ],
        active: [
          { $match: { owner_status: OwnerStatus.ACTIVE } },
          { $count: 'count' },
        ],
        pending: [
          { $match: { owner_status: OwnerStatus.PENDING_VERIFICATION } },
          { $count: 'count' },
        ],
        total_properties: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total_properties_created' },
            },
          },
        ],
        avg_properties_per_owner: [
          {
            $group: {
              _id: null,
              avg: { $avg: '$total_properties_created' },
            },
          },
        ],
        total_revenue: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total_revenue' },
            },
          },
        ],
      },
    },
  ]);
};

OwnerSchema.statics.getSubscriptionDistribution = function () {
  return this.aggregate([
    {
      $match: { owner_status: OwnerStatus.ACTIVE },
    },
    {
      $group: {
        _id: '$subscription_plan',
        count: { $sum: 1 },
        avg_properties: { $avg: '$total_properties_created' },
        total_revenue: { $sum: '$total_revenue' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

OwnerSchema.statics.findNearby = function (
  lat: number,
  lng: number,
  maxDistance: number = 10000,
) {
  return this.find({
    'address_details.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        $maxDistance: maxDistance,
      },
    },
    owner_status: OwnerStatus.ACTIVE,
  });
};
