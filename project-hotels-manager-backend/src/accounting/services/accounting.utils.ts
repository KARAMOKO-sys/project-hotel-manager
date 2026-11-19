import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/** Convertit un identifiant en ObjectId ou lève une erreur 400. */
export function toObjectId(id: unknown, field = 'id'): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`Identifiant invalide (${field})`);
  }
  return new Types.ObjectId(id);
}

/** Échappe une saisie utilisateur utilisée dans une expression `$regex`. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Erreur Mongo de clé dupliquée (index unique). */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
