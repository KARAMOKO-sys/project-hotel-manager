// src/common/entities/auditable.entity.ts
import { Prop, Schema } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Exclude } from 'class-transformer';

// Définir un type pour le document
export type AuditableEntityDocument = AuditableEntity & Document;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      // Vérifier si ret existe et est un objet
      if (ret && typeof ret === 'object') {
        // Exclure les champs supprimés par défaut
        /*
        if (ret.deleted_at) {
          // Optionnel: masquer complètement le document
          // return undefined;
        }
        */
      }
      return ret;
    },
  },
})
export abstract class AuditableEntity extends Document {
  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  created_at!: Date;

  @Prop({
    type: Date,
    default: Date.now,
    index: true,
  })
  updated_at!: Date;

  @Prop({
    type: Date,
    required: false,
    index: true,
    sparse: true,
  })
  deleted_at?: Date;

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  is_deleted!: boolean;

  // Méthodes utilitaires
  markAsDeleted(): void {
    this.is_deleted = true;
    this.deleted_at = new Date();
  }

  restore(): void {
    this.is_deleted = false;
    this.deleted_at = undefined;
  }

  isDeleted(): boolean {
    return this.is_deleted === true;
  }

  isSoftDeleted(): boolean {
    return this.isDeleted() && !!this.deleted_at;
  }

  getCreationDate(): Date {
    return this.created_at;
  }

  getLastUpdateDate(): Date {
    return this.updated_at;
  }

  getDeletionDate(): Date | undefined {
    return this.deleted_at;
  }
}

// Créer le schéma avec le type correct
/*
export const AuditableSchema = SchemaFactory.createForClass(AuditableEntity as any);
// ========================
// MÉTHODES STATIQUES
// ========================

AuditableSchema.statics.findActive = function() {
  return this.find({ is_deleted: false });
};

AuditableSchema.statics.findDeleted = function() {
  return this.find({ is_deleted: true });
};

AuditableSchema.statics.findWithDeleted = function() {
  return this.find({});
};

AuditableSchema.statics.restoreMany = function(ids: string[]) {
  return this.updateMany(
    { _id: { $in: ids } },
    {
      is_deleted: false,
      deleted_at: null,
      updated_at: new Date(),
    },
  );
};

AuditableSchema.statics.deleteMany = function(ids: string[]) {
  return this.updateMany(
    { _id: { $in: ids } },
    {
      is_deleted: true,
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  );
};

AuditableSchema.statics.findCreatedBetween = function(
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    created_at: { $gte: startDate, $lte: endDate },
    is_deleted: false,
  });
};

AuditableSchema.statics.findUpdatedBetween = function(
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    updated_at: { $gte: startDate, $lte: endDate },
    is_deleted: false,
  });
};

AuditableSchema.statics.getStats = function() {
  return this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        active: [{ $match: { is_deleted: false } }, { $count: 'count' }],
        deleted: [{ $match: { is_deleted: true } }, { $count: 'count' }],
        createdToday: [
          {
            $match: {
              created_at: { $gte: new Date(new Date().setHours(0, 0, 0)) },
              is_deleted: false,
            },
          },
          { $count: 'count' },
        ],
      },
    },
  ]);
};

// ========================
// MIDDLEWARE
// ========================

// Middleware pre-save
AuditableSchema.pre('save', function(next) {
  // Mongoose gère déjà timestamps, mais on peut ajouter des logiques supplémentaires
  if (this.isModified('is_deleted') && this.is_deleted) {
    // Si marqué comme supprimé, définir deleted_at
    if (!this.deleted_at) {
      this.deleted_at = new Date();
    }
  }
  next();
});

// Middleware pre-find pour filtrer les documents supprimés par défaut
AuditableSchema.pre('find', function() {
  // Ne pas filtrer automatiquement pour permettre la flexibilité
  // Utiliser le service pour filtrer
});
*/
