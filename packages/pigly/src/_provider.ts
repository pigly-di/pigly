import { IContext } from "./_context";

export interface IProvider<T> {
  (ctx: IContext): T;
}