import { IContext } from "../_context";
import { IProvider } from "../_provider";

export function whenAll<T>(predicates: Array<(ctx: IContext) => boolean>, provider: IProvider<T>) {
  return (ctx: IContext) => {
    for(let predicate of predicates){
      if(predicate(ctx) == false) return undefined;
    }
    return provider(ctx);
  };
}
