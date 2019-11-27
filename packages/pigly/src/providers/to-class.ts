import { IProvider, ProviderWrap } from "../_provider";
import { IContext } from "../_context";
import { Newable } from "../_newable";

///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are exclusively inferable interface types */
//export function toClass<T>(): IProvider<T>

/** manually bind a class constructor to argument providers */
export function toClass<T extends Newable<any>>(ctor: T, ...providers: ProviderWrap<ConstructorParameters<T>>): IProvider<T> {
  if (ctor === undefined) throw Error('called "toClass" without a Constructor argument');

  return (ctx: IContext) => {
    return new ctor(...providers.map(provider => provider(ctx)));
  }
}
