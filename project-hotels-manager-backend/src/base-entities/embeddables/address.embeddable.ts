// src/common/embeddables/address.embeddable.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { IAddress } from '../interfaces/address.interface';
//import { IAddress } from '../interfaces/address.interface';

@Schema({
  _id: false, // Pas d'ID pour les sous-documents
  timestamps: false,
})
export class AddressEmbeddable implements IAddress {
  @Prop({
    type: String,
    required: false,
    maxlength: 255,
    trim: true,
  })
  street?: string;

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
    maxlength: 20,
    trim: true,
  })
  postal_code?: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 100,
    trim: true,
  })
  country?: string;

  // Méthodes utilitaires
  getFullAddress(): string {
    const parts = [
      this.street,
      this.city,
      this.state,
      this.postal_code,
      this.country,
    ].filter((part) => part && part.trim().length > 0);

    return parts.join(', ');
  }

  getShortAddress(): string {
    const parts = [this.city, this.country].filter(
      (part) => part && part.trim().length > 0,
    );

    return parts.join(', ');
  }
  /*
  getFormattedAddress(format: 'simple' | 'full' | 'postal' = 'full'): string {
    switch (format) {
      case 'simple':
        return this.getShortAddress();
      case 'postal':
        const postalParts = [this.postal_code, this.city, this.country].filter(
          (part) => part && part.trim().length > 0,
        );
        return postalParts.join(' ');
      case 'full':
      default:
        return this.getFullAddress();
    }
  }
  */

  isValid(): boolean {
    // Vérifie si l'adresse a au moins une rue ou une ville
    return !!(this.street || this.city);
  }

  hasCoordinates(): boolean {
    // Pour compatibilité avec les interfaces
    return false;
  }

  getCoordinates(): { latitude: number; longitude: number } | null {
    return null;
  }

  toJSON(): IAddress {
    return {
      street: this.street,
      city: this.city,
      state: this.state,
      postal_code: this.postal_code,
      country: this.country,
    };
  }

  toString(): string {
    return this.getFullAddress();
  }
}

export const AddressSchema = SchemaFactory.createForClass(AddressEmbeddable);

// Ajout des index pour les recherches géographiques
AddressSchema.index({ city: 1 });
AddressSchema.index({ country: 1 });
AddressSchema.index({ postal_code: 1 });
AddressSchema.index({ city: 1, country: 1 });

// Middleware pour valider l'adresse avant la sauvegarde
/*
AddressSchema.pre('save', function (next) {
  // Vérifier que l'adresse a au moins une rue ou une ville
  if (!this.street && !this.city) {
    next(new Error('Address must have at least a street or city'));
  }

  // Nettoyer les champs
  if (this.street) this.street = this.street.trim();
  if (this.city) this.city = this.city.trim();
  if (this.state) this.state = this.state.trim();
  if (this.country) this.country = this.country.trim();
  if (this.postal_code)
    this.postal_code = this.postal_code.trim().toUpperCase();

  next();
});
*/

// Méthodes statiques pour les recherches
AddressSchema.statics.findByCountry = function (country: string) {
  return this.find({ country: { $regex: country, $options: 'i' } });
};

AddressSchema.statics.findByCity = function (city: string) {
  return this.find({ city: { $regex: city, $options: 'i' } });
};

AddressSchema.statics.findByPostalCode = function (postalCode: string) {
  return this.find({ postal_code: postalCode });
};
