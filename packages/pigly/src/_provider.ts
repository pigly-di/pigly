import { IContext } from "./_context";

export interface IProvider {
  create(ctx: IContext): object
}