// src/base-entities/user.abstract.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcryptjs';
import { AuditableEntity } from './embeddables/auditable.entity';

// Définir un type pour le document User
export type UserDocument = User & Document;

/*
@Schema({
  timestamps: true,
  collection: 'users',
  discriminatorKey: 'userType',
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      // Vérifier si les propriétés existent avant de les supprimer
      if (ret && typeof ret === 'object') {
        delete ret.password_hash;
        delete ret.two_factor_secret;
      }
      return ret;
    }
  },
  toObject: {
    virtuals: true
  }
})
*/

export abstract class User extends AuditableEntity {
  // ========================
  // IDENTITÉ - UUID comme référence unique
  // ========================

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    maxlength: 255,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  })
  email!: string;

  @Prop({
    type: String,
    required: false,
    index: true,
    trim: true,
    maxlength: 50,
  })
  phone?: string;

  // ========================
  // AUTHENTIFICATION
  // ========================

  @Prop({
    type: String,
    required: true,
    maxlength: 255,
    select: false,
  })
  @Exclude()
  password_hash!: string;

  @Prop({
    type: Date,
    required: false,
  })
  password_changed_at?: Date;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  failed_login_attempts!: number;

  @Prop({
    type: Date,
    required: false,
  })
  locked_until?: Date;

  // ========================
  // PROFIL
  // ========================

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  first_name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  last_name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  avatar_url?: string;

  // ========================
  // PARAMÈTRES
  // ========================

  @Prop({
    type: String,
    default: 'fr',
    maxlength: 10,
  })
  language!: string;

  @Prop({
    type: String,
    default: 'Africa/Abidjan',
    maxlength: 100,
  })
  timezone!: string;

  // ========================
  // STATUT
  // ========================

  @Prop({
    type: Boolean,
    default: true,
  })
  is_active!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_email_verified!: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_phone_verified!: boolean;

  // ========================
  // SÉCURITÉ AVANCÉE
  // ========================

  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    select: false,
  })
  @Exclude()
  two_factor_secret?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  two_factor_enabled!: boolean;

  // ========================
  // TRACKING
  // ========================

  @Prop({
    type: Date,
    required: false,
  })
  last_login_at?: Date;

  @Prop({
    type: String,
    required: false,
    maxlength: 45,
  })
  last_login_ip?: string;

  // ========================
  // FLEX DATA
  // ========================

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  metadata?: Record<string, any>;

  // ========================
  // VIRTUAL PROPERTIES
  // ========================

  getFullName(): string {
    return `${this.first_name ?? ''} ${this.last_name ?? ''}`.trim();
  }

  getDisplayName(): string {
    return this.getFullName() || this.email || 'Utilisateur';
  }

  getInitials(): string {
    if (!this.first_name && !this.last_name) return 'U';
    const first = this.first_name?.charAt(0) || '';
    const last = this.last_name?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  }

  // ========================
  // MÉTHODES MÉTIER
  // ========================

  isLocked(): boolean {
    return this.locked_until ? this.locked_until > new Date() : false;
  }

  incrementFailedLoginAttempts(): void {
    this.failed_login_attempts = (this.failed_login_attempts || 0) + 1;

    if (this.failed_login_attempts >= 5) {
      this.locked_until = new Date(Date.now() + 30 * 60 * 1000);
    }
  }

  resetFailedLoginAttempts(): void {
    this.failed_login_attempts = 0;
    this.locked_until = undefined;
  }

  updateLastLogin(ip: string): void {
    this.last_login_at = new Date();
    this.last_login_ip = ip;
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  async setPassword(password: string): Promise<void> {
    this.password_hash = await bcrypt.hash(password, 10);
    this.password_changed_at = new Date();
  }

  isPasswordExpired(maxAgeDays: number = 90): boolean {
    if (!this.password_changed_at) return true;
    const daysSinceChange =
      (Date.now() - this.password_changed_at.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > maxAgeDays;
  }

  enableTwoFactor(secret: string): void {
    this.two_factor_secret = secret;
    this.two_factor_enabled = true;
  }

  disableTwoFactor(): void {
    this.two_factor_secret = undefined;
    this.two_factor_enabled = false;
  }

  // ========================
  // MÉTHODES ABSTRAITES
  // ========================

  abstract getUserType(): string;
  abstract getDashboardRoute(): string;
  abstract getPermissions(): string[];

  /*
  // ========================
  // VALIDATION
  // ========================

  isValid(): boolean {
    return !!(
      this.email &&
      this.password_hash
    );
  }

  hasCompleteProfile(): boolean {
    return !!(
      this.first_name &&
      this.last_name &&
      this.phone
    );
  }

  // ========================
  // UTILITAIRES
  // ========================

  toJSON(): any {
    const obj = this.toObject ? this.toObject() : this;
    // Exclure les données sensibles
    delete obj.password_hash;
    delete obj.two_factor_secret;
    return obj;
  }

  */

  getSafeProfile(): any {
    return {
      id: this._id,
      email: this.email,
      phone: this.phone,
      first_name: this.first_name,
      last_name: this.last_name,
      full_name: this.getFullName(),
      avatar_url: this.avatar_url,
      language: this.language,
      timezone: this.timezone,
      is_active: this.is_active,
      is_email_verified: this.is_email_verified,
      is_phone_verified: this.is_phone_verified,
      last_login_at: this.last_login_at,
      user_type: this.getUserType(),
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

// Créer le schéma avec un type explicite
export const UserSchema = SchemaFactory.createForClass(User as any);

// ========================
// INDEX
// ========================

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 });
UserSchema.index({ first_name: 1, last_name: 1 });
UserSchema.index({ is_active: 1 });
UserSchema.index({ is_email_verified: 1 });
UserSchema.index({ last_login_at: -1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ created_at: -1 });

// ========================
// MIDDLEWARE PRE-SAVE
// ========================
/*
UserSchema.pre('save', function(next) {
  // Normaliser l'email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  // Normaliser le téléphone
  if (this.phone) {
    this.phone = this.phone.trim();
  }

  // Définir un avatar par défaut si non défini
  if (!this.avatar_url && (this.first_name || this.last_name)) {
    const initials = this.first_name && this.last_name
      ? `${this.first_name.charAt(0)}${this.last_name.charAt(0)}`.toUpperCase()
      : 'U';
    this.avatar_url = `https://ui-avatars.com/api/?name=${initials}&background=667eea&color=fff&size=128`;
  }

  // Définir les valeurs par défaut
  if (this.failed_login_attempts === undefined) {
    this.failed_login_attempts = 0;
  }

  if (this.is_active === undefined) {
    this.is_active = true;
  }

  if (this.is_email_verified === undefined) {
    this.is_email_verified = false;
  }

  if (this.is_phone_verified === undefined) {
    this.is_phone_verified = false;
  }

  if (this.two_factor_enabled === undefined) {
    this.two_factor_enabled = false;
  }

  next();
});
*/

// ========================
// MIDDLEWARE POST-SAVE
// ========================

/*
UserSchema.post('save', function(doc) {
  // Log de l'activité utilisateur
  console.log(`User ${doc.email} (${doc.userType || 'unknown'}) saved at ${new Date()}`);
});
*/

// ========================
// MÉTHODES STATIQUES
// ========================

UserSchema.statics.findByEmail = function (email: string) {
  return this.findOne({
    email: { $regex: `^${email}$`, $options: 'i' },
  });
};

UserSchema.statics.findActive = function () {
  return this.find({ is_active: true });
};

UserSchema.statics.findByType = function (userType: string) {
  return this.find({ userType: userType });
};

UserSchema.statics.findLocked = function () {
  return this.find({
    locked_until: { $gt: new Date() },
  });
};

UserSchema.statics.search = function (searchTerm: string) {
  return this.find({
    $or: [
      { email: { $regex: searchTerm, $options: 'i' } },
      { first_name: { $regex: searchTerm, $options: 'i' } },
      { last_name: { $regex: searchTerm, $options: 'i' } },
      { phone: { $regex: searchTerm, $options: 'i' } },
    ],
  });
};

/*
UserSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [{ $match: { is_active: true } }, { $count: 'count' }],
        inactive: [{ $match: { is_active: false } }, { $count: 'count' }],
        verified: [{ $match: { is_email_verified: true } }, { $count: 'count' }],
        by_type: [
          {
            $group: {
              _id: '$userType',
              count: { $sum: 1 }
            }
          }
        ],
        recent: [
          {
            $match: {
              created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
            }
          },
          { $count: 'count' }
        ]
      }
    }
  ]);
};

*/
