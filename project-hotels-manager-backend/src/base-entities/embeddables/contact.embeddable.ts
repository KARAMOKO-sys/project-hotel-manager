// src/common/embeddables/contact.embeddable.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface IContact {
  name?: string;
  phone?: string;
  email?: string;
  position?: string;
  department?: string;
  is_primary?: boolean;
  is_emergency?: boolean;
}

@Schema({
  _id: false, // Pas d'ID pour les sous-documents
  timestamps: false,
})
export class ContactEmbeddable implements IContact {
  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    trim: true,
  })
  name?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 50,
    trim: true,
    match: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/,
  })
  phone?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    trim: true,
    lowercase: true,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  })
  email?: string;

  // Propriétés supplémentaires
  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  position?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  department?: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_primary?: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_emergency?: boolean;

  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  metadata?: {
    notes?: string;
    preferred_contact_method?: 'email' | 'phone' | 'sms' | 'whatsapp';
    availability?: {
      monday?: { start: string; end: string };
      tuesday?: { start: string; end: string };
      wednesday?: { start: string; end: string };
      thursday?: { start: string; end: string };
      friday?: { start: string; end: string };
      saturday?: { start: string; end: string };
      sunday?: { start: string; end: string };
    };
    timezone?: string;
    language?: string;
  };

  // Méthodes utilitaires
  getFullName(): string {
    return this.name || 'Unknown Contact';
  }

  getDisplayName(): string {
    return this.name || this.email || 'Unknown Contact';
  }

  getContactInfo(): { name: string; phone?: string; email?: string } {
    return {
      name: this.getFullName(),
      phone: this.phone,
      email: this.email,
    };
  }

  getPreferredContactMethod(): string {
    return this.metadata?.preferred_contact_method || 'email';
  }

  hasEmail(): boolean {
    return !!(this.email && this.email.trim().length > 0);
  }

  hasPhone(): boolean {
    return !!(this.phone && this.phone.trim().length > 0);
  }

  isValid(): boolean {
    return !!(this.name || this.email || this.phone);
  }

  isComplete(): boolean {
    return !!(this.name && (this.email || this.phone));
  }

  getPrimaryContact(): string {
    if (this.is_primary) {
      return this.getDisplayName();
    }
    return '';
  }

  getEmergencyContact(): string {
    if (this.is_emergency) {
      return this.getDisplayName();
    }
    return '';
  }

  toJSON(): IContact {
    return {
      name: this.name,
      phone: this.phone,
      email: this.email,
      position: this.position,
      department: this.department,
      is_primary: this.is_primary,
      is_emergency: this.is_emergency,
    };
  }

  toString(): string {
    const parts = [this.name, this.phone, this.email].filter(
      (part) => part && part.trim().length > 0,
    );
    return parts.join(' | ');
  }

  // Méthode pour formater le numéro de téléphone
  formatPhone(
    style: 'international' | 'national' | 'local' = 'international',
  ): string {
    if (!this.phone) return '';

    // Exemple de formatage simple (à adapter selon les besoins)
    const cleaned = this.phone.replace(/\D/g, '');

    switch (style) {
      case 'international':
        return `+${cleaned}`;
      case 'national':
        return cleaned.replace(
          /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
          '$1 $2 $3 $4 $5',
        );
      case 'local':
      default:
        return cleaned;
    }
  }

  // Méthode pour masquer l'email (protection des données)
  getMaskedEmail(): string {
    if (!this.email) return '';
    const [username, domain] = this.email.split('@');
    if (!username || !domain) return this.email;
    const maskedUsername =
      username.length > 2
        ? `${username.slice(0, 2)}${'*'.repeat(Math.min(username.length - 2, 4))}`
        : username;
    return `${maskedUsername}@${domain}`;
  }

  // Méthode pour masquer le téléphone
  getMaskedPhone(): string {
    if (!this.phone) return '';
    const cleaned = this.phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return '****';
    const visible = cleaned.slice(-4);
    return `****${visible}`;
  }
}

export const ContactSchema = SchemaFactory.createForClass(ContactEmbeddable);

// Ajout des index pour les recherches
ContactSchema.index({ email: 1 });
ContactSchema.index({ phone: 1 });
ContactSchema.index({ name: 1 });
ContactSchema.index({ is_primary: 1 });
ContactSchema.index({ is_emergency: 1 });

// Middleware pre-save pour la validation
/*
ContactSchema.pre('save', function (next) {
  // Nettoyer les champs
  if (this.name) this.name = this.name.trim();
  if (this.email) this.email = this.email.trim().toLowerCase();
  if (this.phone) this.phone = this.phone.trim();

  // Validation de l'email
  if (
    this.email &&
    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.email)
  ) {
    next(new Error('Invalid email format'));
  }

  next();
});

*/

// Méthodes statiques
ContactSchema.statics.findByEmail = function (email: string) {
  return this.find({ email: { $regex: email, $options: 'i' } });
};

ContactSchema.statics.findByPhone = function (phone: string) {
  return this.find({ phone: { $regex: phone, $options: 'i' } });
};

ContactSchema.statics.findPrimary = function () {
  return this.find({ is_primary: true });
};

ContactSchema.statics.findEmergency = function () {
  return this.find({ is_emergency: true });
};
