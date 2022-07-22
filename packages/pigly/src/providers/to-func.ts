import { IProvider, ProviderWrap } from "../_provider";
import { IContext } from "../_context";

export function toFunc<F extends ((...args: any[]) => any)>(
  func: F, ...providers: ProviderWrap<Parameters<F>>): IProvider<ReturnType<F>> {

  if (func === undefined) throw Error('called "toFunc" without a function argument');

  return (ctx: IContext) => {
    return func(...providers.map(provider => provider ? provider(ctx) : undefined));
  }
}
