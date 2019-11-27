import { IProvider, ProviderWrap } from "../_provider";
import { IContext } from "../_context";
import { Constructor } from "../_constructor";

/** manually bind a class constructor to argument providers */
export function toClass<C extends Constructor>(ctor: C, ...providers: ProviderWrap<ConstructorParameters<C>>): IProvider<InstanceType<C>> {
  if (ctor === undefined) throw Error('called "toClass" without a Constructor argument');

  return (ctx: IContext) => {
    return new ctor(...providers.map(provider => provider ? provider(ctx) : undefined));
  }
}
