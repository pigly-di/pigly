import { IContext } from "./_context";

export interface IProvider<T> {
  (ctx: IContext): T;
  meta?: {
    /** The name of the provider */
    name?: string
    [key: string] : any
  }
}

export type ProviderWrap<T> = T extends any[]
  ? {
    [P in keyof T]: IProvider<T[P]>;
  } : [];

export function isProvider(obj: any): obj is IProvider<unknown>{
  return typeof(obj) == "function"
}