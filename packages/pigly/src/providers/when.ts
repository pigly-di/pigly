import { IContext } from "../_context";
import { IProvider } from "../_provider";

export function when<T>(predicate: (ctx: IContext) => boolean, provider: IProvider<T>) {
  const wrappedProvider = ((ctx: IContext) => {
    if (predicate(ctx)) return provider(ctx);
  }) as IProvider<T>;

  Object.defineProperty(wrappedProvider, "meta", {
    value: { name: "when", predicate, provider },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return wrappedProvider;
}
