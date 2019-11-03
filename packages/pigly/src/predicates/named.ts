import { IContext } from "../_context";


export function named(name: string): (ctx: IContext) => boolean {
  return (ctx: IContext) => ctx.name == name;
}