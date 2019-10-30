import { IContext } from "./_context";

export interface IBinding {
  provider: (ctx: IContext) => any
}