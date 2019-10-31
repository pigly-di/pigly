import { Newable } from "../_newable";
import { IProvider } from "../_provider";
import { toClass } from "./to-class";

///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are inferable */
export function toSelf<T>(ctor: Newable<T>): IProvider<T>
export function toSelf<T>(ctor: Newable<T>, ...providers: IProvider<any>[]): IProvider<T>
{
  return (toClass as any)(ctor, ...providers);
}