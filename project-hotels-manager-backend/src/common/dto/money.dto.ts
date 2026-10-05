import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { Currency } from '../../base-entities/enums/currency.enum';

/**
 * DTO réutilisable représentant un montant + une devise.
 *
 * Correspond au sous-document `MoneyEmbeddable` côté Mongoose.
 */
export class MoneyDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
