import { IProvider } from "../_provider";
import { IContext } from "../_context";
import { Newable0, Newable1, Newable2, Newable3, Newable4, Newable5 } from "../_newable";


///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are exclusively inferable interface types */
//export function toClass<T>(): IProvider<T>

/** manually bind a class constructor to argument providers */
export function toClass<T>(ctor: Newable0<T>): IProvider<T>
export function toClass<T, P1>(ctor: Newable1<T, P1>, p1: IProvider<P1>): IProvider<T>
export function toClass<T, P1, P2>(ctor: Newable2<T, P1, P2>, p1: IProvider<P1>, p2: IProvider<P2>): IProvider<T>
export function toClass<T, P1, P2, P3>(ctor: Newable3<T, P1, P2, P3>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>): IProvider<T>
export function toClass<T, P1, P2, P3, P4>(ctor: Newable4<T, P1, P2, P3, P4>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>, p4: IProvider<P4>): IProvider<T>
export function toClass<T, P1, P2, P3, P4, P5>(ctor: Newable5<T, P1, P2, P3, P4, P5>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>, p4: IProvider<P4>, p5: IProvider<P5>): IProvider<T>
export function toClass(ctor?: any, ...providers: IProvider<any>[]) {
  if (ctor === undefined) throw Error('called "toClass" without a Constructor argument');

  return (ctx: IContext) => {
    return new ctor(...providers.map(provider => provider(ctx)));
  }
}