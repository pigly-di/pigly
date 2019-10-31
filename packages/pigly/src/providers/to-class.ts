import { IProvider } from "../_provider";
import { IContext } from "../_context";

export interface Newable0<T> {
  new(): T;
}
export interface Newable1<T, P1> {
  new(p1: P1): T;
}
export interface Newable2<T, P1, P2> {
  new(p1: P1, p2: P2): T;
}
export interface Newable3<T, P1, P2, P3> {
  new(p1: P1, p2: P2, p3: P3): T;
}
export interface Newable4<T, P1, P2, P3, P4> {
  new(p1: P1, p2: P2, p3: P3, p4: P4): T;
}
export interface Newable5<T, P1, P2, P3, P4, P5> {
  new(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): T;
}
export type Newable<T> = {
  new(...args: any[]): T;
}



///** REQUIRES TRANSFORMER - create a class provider where the constructor arguments are exclusively inferable interface types */
//export function toClass<T>(): IProvider<T>
export function toClass<T>(): IProvider<T>
export function toClass<T>(ctor: Newable0<T>): IProvider<T>
export function toClass<T, P1>(ctor: Newable1<T, P1>, p1: IProvider<P1>): IProvider<T>
export function toClass<T, P1, P2>(ctor: Newable2<T, P1, P2>, p1: IProvider<P1>, p2: IProvider<P2>): IProvider<T>
export function toClass<T, P1, P2, P3>(ctor: Newable3<T, P1, P2, P3>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>): IProvider<T>
export function toClass<T, P1, P2, P3, P4>(ctor: Newable4<T, P1, P2, P3, P4>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>, p4: IProvider<P4>): IProvider<T>
export function toClass<T, P1, P2, P3, P4, P5>(ctor: Newable5<T, P1, P2, P3, P4, P5>, p1: IProvider<P1>, p2: IProvider<P2>, p3: IProvider<P3>, p4: IProvider<P4>, p5: IProvider<P5>): IProvider<T>
export function toClass(ctor?: any, ...providers: IProvider<any>[]) {
  if (ctor === undefined) throw Error('called "toClass" without a Constructor argument');

  /** this is a hack due to is being a pain in the ass to add "to()" and import in a transformer.
   * see https://github.com/Microsoft/TypeScript/issues/18369
   */
  /*providers = providers.map(x=>{
    if(typeof x === "symbol"){
      return to(x);
    }
    return x;
  })

  console.log(ctor);*/

  return (ctx: IContext) => {
    return new ctor(...providers.map(provider => provider(ctx)));
  }
}