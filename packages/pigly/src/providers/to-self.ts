import { Newable } from "../_newable";
import { IProvider, ProviderWrap } from "../_provider";
import { toClass } from "./to-class";

///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are inferable */
export function toSelf<T extends Newable<any>>(ctor: T, ...providers: ProviderWrap<ConstructorParameters<T>>): IProvider<T>
{
  return toClass(ctor, ...providers);
}