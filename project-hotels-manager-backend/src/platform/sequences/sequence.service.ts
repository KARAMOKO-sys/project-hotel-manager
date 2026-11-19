import { Injectable } from '@nestjs/common';
import { InjectModel, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/** Compteur atomique (équivalent de `ir.sequence` dans Odoo). */
@Schema({
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  collection: 'sequences',
})
export class Sequence {
  /** Clé unique : `<code>|<portée>|<période>`. */
  @Prop({ type: String, required: true, unique: true })
  key!: string;

  @Prop({ type: Number, required: true, default: 0 })
  value!: number;
}

export const SequenceSchema = SchemaFactory.createForClass(Sequence);

export interface NextNumberOptions {
  /** Préfixe affiché, ex. `VE` → `VE/2026/00001`. */
  prefix: string;
  /** Portée du compteur (établissement ou organisation). */
  scopeId?: string;
  /** Remise à zéro annuelle (par défaut) ou jamais. */
  reset?: 'yearly' | 'never';
  padding?: number;
  date?: Date;
}

/**
 * Numérotation séquentielle sans trou par portée et par année, sûre en
 * concurrence (`findOneAndUpdate` + `$inc` + upsert).
 */
@Injectable()
export class SequenceService {
  constructor(
    @InjectModel(Sequence.name) private readonly model: Model<Sequence>,
  ) {}

  async next(code: string, options: NextNumberOptions): Promise<string> {
    const date = options.date ?? new Date();
    const year = String(date.getFullYear());
    const period = options.reset === 'never' ? 'all' : year;
    const key = [code, options.scopeId ?? 'global', period].join('|');
    const counter = await this.model
      .findOneAndUpdate(
        { key },
        { $inc: { value: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .lean()
      .exec();
    const number = String(counter!.value).padStart(options.padding ?? 5, '0');
    return options.reset === 'never'
      ? `${options.prefix}/${number}`
      : `${options.prefix}/${year}/${number}`;
  }
}
