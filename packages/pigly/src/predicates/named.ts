import { IContext } from "../_context";

/** returns true if the parent's target name matches the parameter */
export function named(name: string): (ctx: IContext) => boolean {
  return (ctx: IContext) => ctx.parent && ctx.parent.target == name;
}