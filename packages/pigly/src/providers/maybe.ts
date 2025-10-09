import { IProvider } from "../_provider";
import { ResolveError } from "../errors";

export function maybe<T>(provider: IProvider<T>, fallback: T) {
  const wrappedProvider = ((ctx) => {
    try {
      return provider(ctx);
    } catch (err) {
      // Only use fallback if there are no bindings (ResolveError)
      // Rethrow actual resolution errors (CyclicError, provider errors, etc.)
      if (err instanceof ResolveError) {
        return fallback;
      }
      throw err;
    }
  }) as IProvider<T>;

  Object.defineProperty(wrappedProvider, "meta", {
    value: { name: "maybe", provider },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return wrappedProvider;
}