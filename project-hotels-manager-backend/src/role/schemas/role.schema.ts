// src/modules/roles/schemas/role.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

export enum RoleType {
  SUPER_ADMIN = 'super_admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  RECEPTIONIST = 'receptionist',
  HOUSEKEEPING = 'housekeeping',
  ACCOUNTANT = 'accountant',
  GUEST = 'guest',
  PARTNER = 'partner',
  STAFF = 'staff',
}

export enum RoleLevel {
  SYSTEM = 0,
  ADMIN = 1,
  MANAGEMENT = 2,
  STAFF = 3,
  EXTERNAL = 4,
}

@Schema({
  timestamps: true,
  collection: 'roles',
})
export class Role extends Document {
  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 100,
    trim: true,
    index: true,
  })
  name!: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    maxlength: 50,
    trim: true,
    index: true,
  })
  code!: string;

  @Prop({
    type: String,
    required: false,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: Number,
    enum: RoleLevel,
    default: RoleLevel.STAFF,
    index: true,
  })
  role_level!: RoleLevel;

  @Prop({
    type: Boolean,
    default: false,
  })
  is_system!: boolean;

  @Prop({
    type: [String],
    default: [],
  })
  permissions!: string[];

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;

  @Prop({
    type: Boolean,
    default: true,
    index: true,
  })
  is_active!: boolean;

  // Méthodes
  hasPermission(permission: string): boolean {
    return (
      this.permissions.includes(permission) || this.permissions.includes('*')
    );
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  getRoleTypeLabel(): string {
    const labels: Record<string, string> = {
      super_admin: 'Super Administrateur',
      owner: 'Propriétaire',
      manager: 'Gestionnaire',
      receptionist: 'Réceptionniste',
      housekeeping: 'Personnel de ménage',
      accountant: 'Comptable',
      guest: 'Client',
      partner: 'Partenaire',
      staff: 'Personnel',
    };
    return labels[this.code] || this.name;
  }
}

export const RoleSchema = SchemaFactory.createForClass(Role);

// Index supplémentaires
RoleSchema.index({ role_level: 1, is_active: 1 });
RoleSchema.index({ permissions: 1 });

// ========================
// MIDDLEWARE PRE-SAVE - SUPPRIMÉ (problématique)
// ========================

// Le middleware a été supprimé car il cause l'erreur "next is not a function"
// Le nettoyage des données sera fait dans le service

// ========================
// MIDDLEWARE POST-SAVE
// ========================

RoleSchema.post('save', function (doc: any) {
  console.log(`Role "${doc.name}" (${doc.code}) saved at ${new Date()}`);
});
