import { IContext } from "../_context";
import { IProvider } from "../_provider";

export type DeferFieldProviders<T> = {
  [P in keyof T]?: IProvider<T[P]>
}

/** 
 * Defers field injection until after the resolved instance is cached,
 * allowing cyclic singleton dependencies to be resolved without stack overflow.
 * */
export function defer<T>(provider: IProvider<T>, inject: DeferFieldProviders<T>) {
  return (ctx: IContext) => {
    let resolved = provider(ctx);

    ctx.finally(() => {
      for (let [key, provider] of Object.entries(inject)) {
        let _ctx: IContext = ctx.createContext({ target: key });
        resolved[key] = (provider as any)(_ctx);
      }
    });

    return resolved;
  };
}