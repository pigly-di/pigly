import { IProvider, ProviderWrap } from "../_provider";
import { IContext } from "../_context";
import { IProviderWithMetadata, extractProvider, extractTarget } from "../_provider-metadata";

export function toFunc<F extends ((...args: any[]) => any)>(
  func: F, 
  ...providers: (IProvider<any> | IProviderWithMetadata<any>)[]
): IProvider<ReturnType<F>> {

  if (func === undefined) throw Error('called "toFunc" without a function argument');

  const provider = ((ctx: IContext) => {
    const args = providers.map((providerOrMeta, index) => {
      if (!providerOrMeta) return undefined;
      
      const actualProvider = extractProvider(providerOrMeta);
      const target = extractTarget(providerOrMeta);
      
      // Create child context with target name for this parameter
      const childCtx = ctx.createContext({ target });
      
      return actualProvider(childCtx);
    });
    
    return func(...args);
  }) as IProvider<ReturnType<F>>;

  Object.defineProperty(provider, "meta", {
    value: { name: "toFunc", func },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return provider;
}
