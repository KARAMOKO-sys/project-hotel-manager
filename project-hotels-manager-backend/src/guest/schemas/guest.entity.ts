// src/guest/schemas/guest.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../base-entities/user.abstract';

export type GuestDocument = Guest & Document;

export enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

export enum GuestStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended',
}

@Schema({
  timestamps: true,
  collection: 'guests',
  discriminatorKey: 'userType',
})
export class Guest extends User {
  @Prop({
    type: Date,
    required: false,
  })
  birth_date?: Date;

  @Prop({
    type: Object,
    default: {},
  })
  preferences!: {
    language?: string;
    currency?: string;
    timezone?: string;
    room_preferences?: {
      floor_preference?: 'low' | 'high' | 'any';
      view_preference?: 'pool' | 'sea' | 'city' | 'garden' | 'any';
      smoking_preference?: 'smoking' | 'non-smoking' | 'any';
      bed_preference?: 'king' | 'queen' | 'twin' | 'double' | 'any';
    };
    amenities?: string[];
    special_needs?: string[];
    dietary_requirements?: string[];
    communication_preference?: 'email' | 'sms' | 'whatsapp' | 'phone';
    newsletter_frequency?: 'daily' | 'weekly' | 'monthly' | 'never';
    notification_settings?: {
      booking_updates?: boolean;
      promotions?: boolean;
      reminders?: boolean;
      surveys?: boolean;
    };
  };

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  loyalty_points!: number;

  @Prop({
    type: String,
    enum: Object.values(LoyaltyTier),
    default: LoyaltyTier.BRONZE,
  })
  loyalty_tier!: LoyaltyTier;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_stays!: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  total_spent!: number;

  @Prop({
    type: Boolean,
    default: false,
  })
  marketing_consent!: boolean;

  // Propriétés supplémentaires pour MongoDB
  @Prop({
    type: String,
    enum: Object.values(GuestStatus),
    default: GuestStatus.ACTIVE,
  })
  guest_status?: GuestStatus;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  nationality?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 50,
  })
  identification_type?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
  })
  identification_number?: string;

  @Prop({
    type: String,
    required: false,
  })
  identification_document_url?: string;

  /*
  @Prop({
    type: Object,
    required: false,
  })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  */

  @Prop({
    type: Date,
    required: false,
  })
  last_visit_date?: Date;

  @Prop({
    type: Date,
    required: false,
  })
  last_booking_date?: Date;

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
  total_no_shows?: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  })
  average_rating?: number;

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
  favorite_properties?: Types.ObjectId[];

  @Prop({
    type: [String],
    default: [],
  })
  tags?: string[];

  @Prop({
    type: String,
    required: false,
  })
  referral_code?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Guest',
    required: false,
  })
  referred_by?: Types.ObjectId;

  /*
  @Prop({
    type: Object,
    default: {},
  })
  metadata?: {
    source?: string;
    device_info?: string;
    first_booking_date?: Date;
    last_cancellation_date?: Date;
    notes?: string;
    preferences_updated_at?: Date;
  };
  */

  @Prop({
    type: [
      {
        date: { type: Date },
        action: { type: String },
        description: { type: String },
        points: { type: Number },
      },
    ],
    default: [],
  })
  loyalty_transactions?: Array<{
    date: Date;
    action: string;
    description: string;
    points: number;
  }>;

  // Implémentation des méthodes abstraites
  getUserType(): string {
    return 'guest';
  }

  getDashboardRoute(): string {
    return '/guest/my-bookings';
  }

  getPermissions(): string[] {
    const permissions = [
      'reservations:create_self',
      'reservations:read_self',
      'profile:manage',
    ];

    if (
      this.loyalty_tier === LoyaltyTier.GOLD ||
      this.loyalty_tier === LoyaltyTier.PLATINUM
    ) {
      permissions.push('reservations:modify_self');
      permissions.push('loyalty:bonus_points');
    }

    if (
      this.loyalty_tier === LoyaltyTier.PLATINUM ||
      this.loyalty_tier === LoyaltyTier.DIAMOND
    ) {
      permissions.push('reservations:priority');
      permissions.push('benefits:exclusive');
    }

    return permissions;
  }

  // Méthodes spécifiques aux clients
  getFullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  getDisplayName(): string {
    return this.first_name || this.email || 'Guest';
  }

  getLoyaltyTierLabel(): string {
    const labels = {
      [LoyaltyTier.BRONZE]: 'Bronze',
      [LoyaltyTier.SILVER]: 'Argent',
      [LoyaltyTier.GOLD]: 'Or',
      [LoyaltyTier.PLATINUM]: 'Platine',
      [LoyaltyTier.DIAMOND]: 'Diamant',
    };
    return labels[this.loyalty_tier] || this.loyalty_tier;
  }

  /*
  getStatusLabel(): string {
    const labels = {
      [GuestStatus.ACTIVE]: 'Actif',
      [GuestStatus.INACTIVE]: 'Inactif',
      [GuestStatus.BLOCKED]: 'Bloqué',
      [GuestStatus.SUSPENDED]: 'Suspendu',
    };
    return labels[this.guest_status] || this.guest_status;
  }
  */

  getLoyaltyPointsNeededForNextTier(): number {
    const thresholds = {
      [LoyaltyTier.BRONZE]: 0,
      [LoyaltyTier.SILVER]: 1000,
      [LoyaltyTier.GOLD]: 5000,
      [LoyaltyTier.PLATINUM]: 15000,
      [LoyaltyTier.DIAMOND]: 30000,
    };

    const currentTierIndex = Object.values(LoyaltyTier).indexOf(
      this.loyalty_tier,
    );
    const nextTier = Object.values(LoyaltyTier)[currentTierIndex + 1];

    if (!nextTier) return 0;
    return Math.max(0, thresholds[nextTier] - this.loyalty_points);
  }

  getNextTier(): LoyaltyTier | null {
    const tiers = Object.values(LoyaltyTier);
    const currentIndex = tiers.indexOf(this.loyalty_tier);
    return tiers[currentIndex + 1] || null;
  }

  canUpgradeTier(): boolean {
    const nextTier = this.getNextTier();
    if (!nextTier) return false;
    return this.getLoyaltyPointsNeededForNextTier() <= 0;
  }

  upgradeTier(): void {
    const nextTier = this.getNextTier();
    if (nextTier && this.canUpgradeTier()) {
      this.loyalty_tier = nextTier;
    }
  }

  addLoyaltyPoints(points: number): void {
    if (points <= 0) return;

    this.loyalty_points = (this.loyalty_points || 0) + points;

    // Ajouter à l'historique
    if (!this.loyalty_transactions) {
      this.loyalty_transactions = [];
    }

    this.loyalty_transactions.push({
      date: new Date(),
      action: 'ADD',
      description: `Points ajoutés : ${points}`,
      points: points,
    });

    // Vérifier si le client peut passer au niveau supérieur
    if (this.canUpgradeTier()) {
      this.upgradeTier();
    }
  }

  redeemLoyaltyPoints(points: number): boolean {
    if (points <= 0 || points > this.loyalty_points) return false;

    this.loyalty_points = (this.loyalty_points || 0) - points;

    // Ajouter à l'historique
    if (!this.loyalty_transactions) {
      this.loyalty_transactions = [];
    }

    this.loyalty_transactions.push({
      date: new Date(),
      action: 'REDEEM',
      description: `Points utilisés : ${points}`,
      points: -points,
    });

    return true;
  }

  addStay(amount: number): void {
    this.total_stays = (this.total_stays || 0) + 1;
    this.total_spent = (this.total_spent || 0) + amount;
    this.last_visit_date = new Date();
    this.last_booking_date = new Date();

    // Points de fidélité : 1 point par tranche de 1000 XOF
    const pointsEarned = Math.floor(amount / 1000);
    if (pointsEarned > 0) {
      // Bonus selon le niveau
      let bonusMultiplier = 1;
      switch (this.loyalty_tier) {
        case LoyaltyTier.SILVER:
          bonusMultiplier = 1.1;
          break;
        case LoyaltyTier.GOLD:
          bonusMultiplier = 1.25;
          break;
        case LoyaltyTier.PLATINUM:
          bonusMultiplier = 1.5;
          break;
        case LoyaltyTier.DIAMOND:
          bonusMultiplier = 2;
          break;
        default:
          bonusMultiplier = 1;
      }

      const totalPoints = Math.floor(pointsEarned * bonusMultiplier);
      this.addLoyaltyPoints(totalPoints);
    }
  }

  recordCancellation(): void {
    this.total_cancellations = (this.total_cancellations || 0) + 1;
    if (this.total_cancellations > 5) {
      this.guest_status = GuestStatus.SUSPENDED;
    }
  }

  recordNoShow(): void {
    this.total_no_shows = (this.total_no_shows || 0) + 1;
    if (this.total_no_shows > 3) {
      this.guest_status = GuestStatus.SUSPENDED;
    }
  }

  addReview(rating: number): void {
    if (rating < 0 || rating > 5) return;

    if (this.average_rating) {
      const total = this.average_rating * (this.total_reviews || 0) + rating;
      this.total_reviews = (this.total_reviews || 0) + 1;
      this.average_rating = total / this.total_reviews;
    } else {
      this.average_rating = rating;
      this.total_reviews = 1;
    }
  }

  hasActiveSubscription(): boolean {
    return this.guest_status === GuestStatus.ACTIVE;
  }

  isActive(): boolean {
    return this.guest_status === GuestStatus.ACTIVE && this.is_active;
  }

  isSuspended(): boolean {
    return this.guest_status === GuestStatus.SUSPENDED;
  }

  isBlocked(): boolean {
    return this.guest_status === GuestStatus.BLOCKED;
  }

  getMemberSince(): Date {
    return this.created_at;
  }

  getYearsAsMember(): number {
    const now = new Date();
    const diff = now.getTime() - this.created_at.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  }

  getBookingStats(): {
    total_stays: number;
    total_spent: number;
    total_cancellations: number;
    total_no_shows: number;
    average_rating: number | null;
  } {
    return {
      total_stays: this.total_stays || 0,
      total_spent: this.total_spent || 0,
      total_cancellations: this.total_cancellations || 0,
      total_no_shows: this.total_no_shows || 0,
      average_rating: this.average_rating || null,
    };
  }

  getPreferencesSummary(): string {
    const prefs = this.preferences || {};
    const summary: string[] = [];

    if (prefs.room_preferences) {
      const roomPrefs = prefs.room_preferences;
      if (roomPrefs.view_preference) {
        summary.push(`Vue: ${roomPrefs.view_preference}`);
      }
      if (roomPrefs.bed_preference) {
        summary.push(`Lit: ${roomPrefs.bed_preference}`);
      }
      if (roomPrefs.smoking_preference) {
        summary.push(
          roomPrefs.smoking_preference === 'non-smoking'
            ? 'Non-fumeur'
            : 'Fumeur',
        );
      }
    }

    if (prefs.dietary_requirements && prefs.dietary_requirements.length > 0) {
      summary.push(`Régime: ${prefs.dietary_requirements.join(', ')}`);
    }

    if (prefs.special_needs && prefs.special_needs.length > 0) {
      summary.push(`Besoins spéciaux: ${prefs.special_needs.join(', ')}`);
    }

    return summary.length > 0 ? summary.join('; ') : 'Aucune préférence';
  }

  getCommunicationPreferences(): {
    preferred_method: string;
    notifications: any;
    newsletter_frequency: string;
  } {
    return {
      preferred_method: this.preferences?.communication_preference || 'email',
      notifications: this.preferences?.notification_settings || {},
      newsletter_frequency: this.preferences?.newsletter_frequency || 'weekly',
    };
  }

  addTag(tag: string): void {
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    if (this.tags) {
      this.tags = this.tags.filter((t) => t !== tag);
    }
  }

  hasTag(tag: string): boolean {
    return this.tags ? this.tags.includes(tag) : false;
  }

  addFavoriteProperty(propertyId: Types.ObjectId): void {
    if (!this.favorite_properties) {
      this.favorite_properties = [];
    }
    if (!this.favorite_properties.includes(propertyId)) {
      this.favorite_properties.push(propertyId);
    }
  }

  removeFavoriteProperty(propertyId: Types.ObjectId): void {
    if (this.favorite_properties) {
      this.favorite_properties = this.favorite_properties.filter(
        (id) => id.toString() !== propertyId.toString(),
      );
    }
  }

  hasFavoriteProperty(propertyId: Types.ObjectId): boolean {
    return this.favorite_properties
      ? this.favorite_properties.some(
          (id) => id.toString() === propertyId.toString(),
        )
      : false;
  }

  getLoyaltyHistory(): Array<{
    date: Date;
    action: string;
    description: string;
    points: number;
  }> {
    return this.loyalty_transactions || [];
  }

  generateReferralCode(): string {
    const prefix = 'REF';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${random}`;
  }

  // Méthodes de validation
  isValid(): boolean {
    return !!(this.first_name && this.last_name && this.email && this.phone);
  }

  /*
  toJSON(): any {
    const obj = super.toJSON ? super.toJSON() : this;
    // Exclure les données sensibles
    delete obj.password_hash;
    delete obj.identification_number;
    return obj;
  }
  */
}

export const GuestSchema = SchemaFactory.createForClass(Guest);

// Ajout des index supplémentaires
GuestSchema.index({ loyalty_points: -1 });
GuestSchema.index({ loyalty_tier: 1 });
GuestSchema.index({ total_stays: -1 });
GuestSchema.index({ total_spent: -1 });
GuestSchema.index({ guest_status: 1 });
GuestSchema.index({ 'preferences.language': 1 });
GuestSchema.index({ 'preferences.currency': 1 });
GuestSchema.index({ referral_code: 1 }, { sparse: true });
GuestSchema.index({ referred_by: 1 });
GuestSchema.index({ tags: 1 });
GuestSchema.index({ 'metadata.source': 1 });
GuestSchema.index({ last_visit_date: -1 });
GuestSchema.index({ created_at: -1 });

/*
// Middleware pre-save
GuestSchema.pre('save', function (next) {
  // Valider la date de naissance
  if (this.birth_date && this.birth_date > new Date()) {
    next(new Error('Birth date cannot be in the future'));
  }

  // Générer un code de parrainage si non défini
  if (!this.referral_code) {
    const prefix = 'REF';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referral_code = `${prefix}${random}`;
  }

  // Mettre à jour le statut si nécessaire
  if (!this.guest_status) {
    this.guest_status = GuestStatus.ACTIVE;
  }

  // Mettre à jour le niveau de fidélité en fonction des points
  if (this.loyalty_points >= 30000) {
    this.loyalty_tier = LoyaltyTier.DIAMOND;
  } else if (this.loyalty_points >= 15000) {
    this.loyalty_tier = LoyaltyTier.PLATINUM;
  } else if (this.loyalty_points >= 5000) {
    this.loyalty_tier = LoyaltyTier.GOLD;
  } else if (this.loyalty_points >= 1000) {
    this.loyalty_tier = LoyaltyTier.SILVER;
  } else {
    this.loyalty_tier = LoyaltyTier.BRONZE;
  }

  next();
});

// Middleware post-save pour l'audit
GuestSchema.post('save', function (doc) {
  console.log(
    `Guest ${doc.email} (${doc.first_name} ${doc.last_name}) saved at ${new Date()}`,
  );
});
*/

/*
GuestSchema.statics.findTopSpenders = function (limit: number = 10) {
  return this.find({
    guest_status: GuestStatus.ACTIVE,
    total_spent: { $gt: 0 },
  })
    .sort({ total_spent: -1 })
    .limit(limit);
};

GuestSchema.statics.findTopLoyalty = function (limit: number = 10) {
  return this.find({
    guest_status: GuestStatus.ACTIVE,
    loyalty_points: { $gt: 0 },
  })
    .sort({ loyalty_points: -1 })
    .limit(limit);
};
// Méthodes statiques
GuestSchema.statics.findActive = function () {
  return this.find({
    guest_status: GuestStatus.ACTIVE,
    is_active: true,
  }).sort({ created_at: -1 });
};
*/

GuestSchema.statics.findByTier = function (tier: LoyaltyTier) {
  return this.find({
    loyalty_tier: tier,
    guest_status: GuestStatus.ACTIVE,
  });
};

GuestSchema.statics.findByReferralCode = function (referralCode: string) {
  return this.findOne({ referral_code: referralCode });
};

GuestSchema.statics.findReferredBy = function (guestId: Types.ObjectId) {
  return this.find({
    referred_by: guestId,
    guest_status: GuestStatus.ACTIVE,
  });
};

GuestSchema.statics.findByTag = function (tag: string) {
  return this.find({
    tags: tag,
    guest_status: GuestStatus.ACTIVE,
  });
};

GuestSchema.statics.search = function (searchTerm: string) {
  return this.find({
    $or: [
      { first_name: { $regex: searchTerm, $options: 'i' } },
      { last_name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { phone: { $regex: searchTerm, $options: 'i' } },
      { referral_code: { $regex: searchTerm, $options: 'i' } },
    ],
  });
};

GuestSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        by_status: [
          {
            $group: {
              _id: '$guest_status',
              count: { $sum: 1 },
            },
          },
        ],
        by_tier: [
          {
            $group: {
              _id: '$loyalty_tier',
              count: { $sum: 1 },
            },
          },
        ],
        active: [
          { $match: { guest_status: GuestStatus.ACTIVE } },
          { $count: 'count' },
        ],
        total_spent: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total_spent' },
            },
          },
        ],
        avg_spent: [
          {
            $group: {
              _id: null,
              avg: { $avg: '$total_spent' },
            },
          },
        ],
        total_stays: [
          {
            $group: {
              _id: null,
              total: { $sum: '$total_stays' },
            },
          },
        ],
        avg_rating: [
          {
            $group: {
              _id: null,
              avg: { $avg: '$average_rating' },
            },
          },
        ],
        avg_loyalty_points: [
          {
            $group: {
              _id: null,
              avg: { $avg: '$loyalty_points' },
            },
          },
        ],
      },
    },
  ]);
};

GuestSchema.statics.getLoyaltyDistribution = function () {
  return this.aggregate([
    {
      $match: { guest_status: GuestStatus.ACTIVE },
    },
    {
      $group: {
        _id: '$loyalty_tier',
        count: { $sum: 1 },
        avg_points: { $avg: '$loyalty_points' },
        avg_spent: { $avg: '$total_spent' },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

/*
GuestSchema.statics.getRecentGuests = function (days: number = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return this.find({
    last_visit_date: { $gte: date },
    guest_status: GuestStatus.ACTIVE,
  }).sort({ last_visit_date: -1 });
};

GuestSchema.statics.getInactiveGuests = function (days: number = 90) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return this.find({
    last_visit_date: { $lt: date },
    guest_status: GuestStatus.ACTIVE,
  }).sort({ last_visit_date: 1 });
};

*/
