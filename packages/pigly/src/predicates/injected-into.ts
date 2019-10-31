import { IContext } from "../_context";


export function injectedInto(symbol: symbol): (ctx: IContext) => boolean
export function injectedInto(): never;
export function injectedInto<P>(): (ctx: IContext) => boolean;
export function injectedInto(symbol?: symbol): (ctx: IContext) => boolean {
  return (ctx: IContext) => ctx.parent && ctx.parent.target == symbol;
}

let a = injectedInto();