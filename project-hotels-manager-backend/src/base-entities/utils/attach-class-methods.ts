import { Document, Schema } from 'mongoose';

/**
 * Méthodes Mongoose natives à ne jamais écraser par une méthode de classe.
 */
const RESERVED_METHODS = new Set(['constructor', 'toJSON', 'toObject']);

/**
 * Attache les méthodes d'instance d'une classe (et de ses parents) au schéma.
 *
 * `SchemaFactory.createForClass` ne copie que les `@Prop`, pas les méthodes :
 * sans cet appel, `doc.setPassword()` ou `doc.addLoyaltyPoints()` sont
 * `undefined` à l'exécution. Le parcours de la chaîne de prototypes s'arrête
 * à `stopAt` (par défaut la classe `Document` de Mongoose).
 */
export function attachClassMethods(
  schema: Schema,
  cls: abstract new (...args: any[]) => unknown,
  stopAt: object = Document.prototype,
): void {
  let proto = cls.prototype as object | null;

  while (proto && proto !== Object.prototype && proto !== stopAt) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (RESERVED_METHODS.has(name) || name in schema.methods) {
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(proto, name);
      if (typeof descriptor?.value === 'function') {
        schema.methods[name] = descriptor.value as (...args: any[]) => any;
      }
    }
    proto = Object.getPrototypeOf(proto) as object | null;
  }
}
