// src/base-entities/embeddables/money.embeddable.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Currency {
  XOF = 'XOF',
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  CAD = 'CAD',
  JPY = 'JPY',
  CNY = 'CNY',
  CHF = 'CHF',
  NGN = 'NGN',
  ZAR = 'ZAR',
  KES = 'KES',
  GHS = 'GHS',
}

export interface IMoney {
  amount: number;
  currency: Currency | string;
}

/*
@Schema({
  _id: false,  // Pas d'ID pour les sous-documents
  timestamps: false,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.formatted = doc.format ? doc.format() : `${ret.amount} ${ret.currency}`;
      return ret;
    }
  }
})
*/

export class MoneyEmbeddable implements IMoney {
  @Prop({
    type: Number,
    required: true,
    default: 0,
    min: 0,
    set: (v: number) => Math.round(v * 100) / 100, // Arrondir à 2 décimales
  })
  amount!: number;

  @Prop({
    type: String,
    required: true,
    default: Currency.XOF,
    uppercase: true,
    trim: true,
    maxlength: 3,
    enum: Object.values(Currency),
  })
  currency!: Currency;

  // ========================
  // MÉTHODES UTILITAIRES
  // ========================

  /**
   * Ajoute un montant au solde actuel
   */
  add(value: number): MoneyEmbeddable {
    this.amount = Math.round((this.amount + value) * 100) / 100;
    return this;
  }

  /**
   * Soustrait un montant du solde actuel
   */
  subtract(value: number): MoneyEmbeddable {
    this.amount = Math.max(0, Math.round((this.amount - value) * 100) / 100);
    return this;
  }

  /**
   * Multiplie le montant par un facteur
   */
  multiply(factor: number): MoneyEmbeddable {
    this.amount = Math.round(this.amount * factor * 100) / 100;
    return this;
  }

  /**
   * Divise le montant par un diviseur
   */
  divide(divisor: number): MoneyEmbeddable {
    if (divisor === 0) {
      throw new Error('Division by zero');
    }
    this.amount = Math.round((this.amount / divisor) * 100) / 100;
    return this;
  }

  /**
   * Vérifie si le montant est zéro
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Vérifie si le montant est positif
   */
  isPositive(): boolean {
    return this.amount > 0;
  }

  /**
   * Vérifie si le montant est négatif
   */
  isNegative(): boolean {
    return this.amount < 0;
  }

  /**
   * Vérifie si le montant est égal à une valeur donnée
   */
  equals(value: number): boolean {
    return this.amount === Math.round(value * 100) / 100;
  }

  /**
   * Vérifie si le montant est supérieur à une valeur donnée
   */
  greaterThan(value: number): boolean {
    return this.amount > value;
  }

  /**
   * Vérifie si le montant est inférieur à une valeur donnée
   */
  lessThan(value: number): boolean {
    return this.amount < value;
  }

  /**
   * Vérifie si le montant est entre deux valeurs
   */
  between(min: number, max: number): boolean {
    return this.amount >= min && this.amount <= max;
  }

  /**
   * Vérifie si la devise est valide
   */
  isValidCurrency(): boolean {
    return Object.values(Currency).includes(this.currency as Currency);
  }

  /**
   * Obtient le symbole de la devise
   */
  getCurrencySymbol(): string {
    const symbols: Record<Currency, string> = {
      [Currency.XOF]: 'CFA',
      [Currency.EUR]: '€',
      [Currency.USD]: '$',
      [Currency.GBP]: '£',
      [Currency.CAD]: 'C$',
      [Currency.JPY]: '¥',
      [Currency.CNY]: '¥',
      [Currency.CHF]: 'CHF',
      [Currency.NGN]: '₦',
      [Currency.ZAR]: 'R',
      [Currency.KES]: 'KSh',
      [Currency.GHS]: 'GH₵',
    };
    return symbols[this.currency as Currency] || this.currency;
  }

  /**
   * Formate le montant avec la devise
   */
  format(showSymbol: boolean = true, showCurrency: boolean = false): string {
    const formatted = this.amount.toFixed(2);
    if (showSymbol) {
      const symbol = this.getCurrencySymbol();
      return `${symbol} ${formatted}`;
    }
    if (showCurrency) {
      return `${formatted} ${this.currency}`;
    }
    return formatted;
  }

  /**
   * Formate le montant avec séparateurs de milliers
   */
  formatWithThousands(showCurrency: boolean = true): string {
    const parts = this.amount.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const decimalPart = parts[1] || '00';
    const formatted = `${integerPart}.${decimalPart}`;
    return showCurrency ? `${formatted} ${this.currency}` : formatted;
  }

  /**
   * Convertit le montant dans une autre devise (taux de change simulé)
   * À utiliser avec un service de taux de change réel
   */

  /**
   * Retourne la valeur absolue du montant
   */
  abs(): MoneyEmbeddable {
    const newMoney = new MoneyEmbeddable();
    newMoney.amount = Math.abs(this.amount);
    newMoney.currency = this.currency;
    return newMoney;
  }

  /**
   * Arrondit le montant à un nombre donné de décimales
   */
  round(decimals: number = 2): MoneyEmbeddable {
    const factor = Math.pow(10, decimals);
    this.amount = Math.round(this.amount * factor) / factor;
    return this;
  }

  /**
   * Vérifie si le montant est un nombre entier
   */
  isInteger(): boolean {
    return Number.isInteger(this.amount);
  }

  /**
   * Calcule le pourcentage d'un montant
   percentage(percent: number): MoneyEmbeddable {
     const newMoney = new MoneyEmbeddable();
     newMoney.amount = Math.round((this.amount * percent / 100) * 100) / 100;
     newMoney.currency = this.currency;
     return newMoney;
   }
   */

  /**
   * Applique une taxe sur le montant
   applyTax(taxRate: number): MoneyEmbeddable {
     const newMoney = new MoneyEmbeddable();
     newMoney.amount = Math.round((this.amount * (1 + taxRate / 100)) * 100) / 100;
     newMoney.currency = this.currency;
     return newMoney;
   }
   */

  /*

applyDiscount(discountRate: number): MoneyEmbeddable {
  const newMoney = new MoneyEmbeddable();
  newMoney.amount = Math.round((this.amount * (1 - discountRate / 100)) * 100) / 100;
  newMoney.currency = this.currency;
  return newMoney;
}

difference(other: MoneyEmbeddable): MoneyEmbeddable {
  if (this.currency !== other.currency) {
    throw new Error('Cannot compare different currencies');
  }
  const newMoney = new MoneyEmbeddable();
  newMoney.amount = Math.abs(Math.round((this.amount - other.amount) * 100) / 100);
  newMoney.currency = this.currency;
  return newMoney;
}
*/

  /**
   * Calcule la moyenne de plusieurs montants
   */
  static average(moneys: MoneyEmbeddable[]): MoneyEmbeddable {
    if (moneys.length === 0) {
      throw new Error('Cannot calculate average of empty list');
    }

    const firstCurrency = moneys[0].currency;
    if (!moneys.every((m) => m.currency === firstCurrency)) {
      throw new Error('Cannot average different currencies');
    }

    const total = moneys.reduce((sum, m) => sum + m.amount, 0);
    const average = Math.round((total / moneys.length) * 100) / 100;

    const result = new MoneyEmbeddable();
    result.amount = average;
    result.currency = firstCurrency;
    return result;
  }

  /**
   * Somme de plusieurs montants
   */
  static sum(moneys: MoneyEmbeddable[]): MoneyEmbeddable {
    if (moneys.length === 0) {
      const result = new MoneyEmbeddable();
      result.amount = 0;
      result.currency = Currency.XOF;
      return result;
    }

    const firstCurrency = moneys[0].currency;
    if (!moneys.every((m) => m.currency === firstCurrency)) {
      throw new Error('Cannot sum different currencies');
    }

    const total = moneys.reduce((sum, m) => sum + m.amount, 0);
    const result = new MoneyEmbeddable();
    result.amount = Math.round(total * 100) / 100;
    result.currency = firstCurrency;
    return result;
  }

  /**
   * Clone le montant
   */
  clone(): MoneyEmbeddable {
    const newMoney = new MoneyEmbeddable();
    newMoney.amount = this.amount;
    newMoney.currency = this.currency;
    return newMoney;
  }

  /**
   * Convertit en objet JSON simple
   */
  toJSON(): IMoney {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  /**
   * Convertit en chaîne de caractères
   */
  toString(): string {
    return this.format(true, false);
  }

  /**
   * Convertit en objet pour la base de données
   */
  toObject(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  /**
   * Vérifie si le montant est valide
   */
  isValid(): boolean {
    return (
      typeof this.amount === 'number' &&
      !isNaN(this.amount) &&
      isFinite(this.amount) &&
      this.amount >= 0 &&
      this.isValidCurrency()
    );
  }
}

export const MoneySchema = SchemaFactory.createForClass(MoneyEmbeddable);

/*
// ========================
// MIDDLEWARE PRE-SAVE
// ========================

MoneySchema.pre('save', function(next) {
  // Validation du montant
  if (typeof this.amount !== 'number' || isNaN(this.amount) || this.amount < 0) {
    next(new Error('Amount must be a positive number'));
  }

  // Arrondir à 2 décimales
  this.amount = Math.round(this.amount * 100) / 100;

  // Validation de la devise
  if (!Object.values(Currency).includes(this.currency)) {
    next(new Error(`Invalid currency: ${this.currency}`));
  }

  next();
});

// ========================
// MÉTHODES STATIQUES
// ========================

MoneySchema.statics.create = function(amount: number, currency: Currency = Currency.XOF) {
  const money = new this();
  money.amount = Math.round(amount * 100) / 100;
  money.currency = currency;
  return money;
};


MoneySchema.statics.zero = function(currency: Currency = Currency.XOF) {
  return this.create(0, currency);
};

MoneySchema.statics.fromJSON = function(data: IMoney) {
  return this.create(data.amount, data.currency as Currency);
};
*/

// ========================
// VIRTUAL PROPERTIES
// ========================

MoneySchema.virtual('formatted').get(function () {
  return this.format(true, false);
});

MoneySchema.virtual('symbol').get(function () {
  return this.getCurrencySymbol();
});

MoneySchema.virtual('is_zero').get(function () {
  return this.isZero();
});

MoneySchema.virtual('is_positive').get(function () {
  return this.isPositive();
});
