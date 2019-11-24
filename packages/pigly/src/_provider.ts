import { IContext } from "./_context";

export interface IProvider<T> {
  (ctx: IContext): T;
}

export type ProviderWrap<T> = T extends any[]
  ? {
    [P in keyof T]: IProvider<T[P]>;
  } : [];