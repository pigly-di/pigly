import { IContext } from "./_context";
import { Scope } from './_scope';

export interface IBinding {
  provider: (ctx: IContext) => any
  site: string;
  scope: Scope;
}