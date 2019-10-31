import { IContext } from "../_context";
import { IProvider } from "../_provider";

export function when<T>(predicate: (ctx: IContext) => boolean, provider: IProvider<T>) {
  return (ctx: IContext) => {
    if (predicate(ctx)) return provider(ctx);
  };
}
