import { IContext } from "../_context";

export function injectedInto(symbol: symbol): (ctx: IContext) => boolean
export function injectedInto(): never;
export function injectedInto<P>(): (ctx: IContext) => boolean;
export function injectedInto(symbol?: symbol): (ctx: IContext) => boolean {
  const predicate = (ctx: IContext) => ctx.parent && ctx.parent.service == symbol;

  Object.defineProperty(predicate, "meta", {
    value: { name: "injectedInto", symbol },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return predicate;
}