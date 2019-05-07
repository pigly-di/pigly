import { Newable } from "./_common";

export function Resolve<T>(t: T): IResolution<T> { return undefined; }

export interface IResolution<T = any> {
  ctor?: Newable<T>
  constant?: T;  
  args?: {
    [key:string] : symbol
  }
}