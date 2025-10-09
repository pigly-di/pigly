import { IContext } from "../_context";
import { IProvider } from "../_provider";

export function whenAll<T>(predicates: Array<(ctx: IContext) => boolean>, provider: IProvider<T>) {
  const wrappedProvider = ((ctx: IContext) => {
    for(let predicate of predicates){
      if(predicate(ctx) == false) return undefined;
    }
    return provider(ctx);
  }) as IProvider<T>;

  Object.defineProperty(wrappedProvider, "meta", {
    value: { name: "whenAll", predicates, provider },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return wrappedProvider;
}
