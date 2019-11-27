import { Constructor } from "../_constructor";
import { IProvider, ProviderWrap } from "../_provider";
import { toClass } from "./to-class";

///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are inferable */
export function toSelf<C extends Constructor>(ctor: C): IProvider<InstanceType<C>>
export function toSelf<C extends Constructor>(ctor: C, ...providers: ProviderWrap<ConstructorParameters<C>>): IProvider<InstanceType<C>> {
  return toClass(ctor, ...providers);
}