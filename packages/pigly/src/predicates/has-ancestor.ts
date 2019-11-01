import { IContext } from "../_context";

export function hasAncestor(symbol: symbol): (ctx: IContext) => boolean
export function hasAncestor(): never;
export function hasAncestor<P>(): (ctx: IContext) => boolean;
export function hasAncestor(symbol?: symbol): (ctx: IContext) => boolean {
  return (ctx: IContext) => {
    let _parent = ctx.parent;
    while (_parent != undefined) {
      if(_parent.target == symbol){
        return true;
      }
      _parent = _parent.parent;
    };
    return false;
  }
}
