import { IProvider } from "../_provider";
import { IContext } from "../_context";

export function asSingleton<T>(provider: IProvider<T>) {
  var cache: T = undefined;

  return (ctx: IContext) => {
    if (!cache) cache = provider(ctx);
    return cache;
  };
}
