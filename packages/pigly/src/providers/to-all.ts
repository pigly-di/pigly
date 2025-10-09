import { IProvider } from "../_provider";
import { Service, isService } from "../_service";

/** REQUIRES TRANSFORMER - create a provider that resolves all bindings to a type */
export function toAll<T>(): IProvider<T[]>
/** create a provider that resolves all bindings to a symbol */
export function toAll<T>(service: Service): IProvider<T[]>
export function toAll<T>(service?: Service): IProvider<T[]> {
  if (!isService(service)) throw Error('called "toAll" without a service symbol');
  
  const provider = ((ctx) => ctx.resolve<T>({ service }).toArray()) as IProvider<T[]>;

  Object.defineProperty(provider, "meta", {
    value: { name: "toAll", to: service },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return provider;
}