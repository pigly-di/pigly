import { IProvider, ProviderWrap } from "../_provider";
import { IContext } from "../_context";
import { Constructor } from "../_constructor";
import { IProviderWithMetadata, extractProvider, extractTarget } from "../_provider-metadata";

/** manually bind a class constructor to argument providers */
export function toClass<C extends Constructor>(
  ctor: C, 
  ...providers: (IProvider<any> | IProviderWithMetadata<any>)[]
): IProvider<InstanceType<C>> {
  if (ctor === undefined) throw Error('called "toClass" without a Constructor argument');

  if (providers.length !== ctor.length) {
    console.warn(`toClass: ${ctor.name} expects ${ctor.length} parameters but received ${providers.length} providers`);
  }

  const provider = ((ctx: IContext) => {
    const args = providers.map((providerOrMeta, index) => {
      if (!providerOrMeta) return undefined;
      
      const actualProvider = extractProvider(providerOrMeta);
      const target = extractTarget(providerOrMeta);
      
      // Create child context with target name for this parameter
      const childCtx = ctx.createContext({ target });
      
      return actualProvider(childCtx);
    });
    
    return new ctor(...args);
  }) as IProvider<InstanceType<C>>;

  Object.defineProperty(provider, "meta", {
    value: { name: "toClass", ctor },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return provider;
}
