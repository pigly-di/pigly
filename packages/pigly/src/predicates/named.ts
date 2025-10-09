import { IContext } from "../_context";

/** returns true if the parent's target (typically a class field or constructor argument name) matches the name */
export function named(name: string): (ctx: IContext) => boolean {
  const predicate = (ctx: IContext) => (ctx.parent && ctx.parent.target == name) || ctx.request.target == name;

  Object.defineProperty(predicate, "meta", {
    value: { name: "named", targetName: name },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return predicate;
}