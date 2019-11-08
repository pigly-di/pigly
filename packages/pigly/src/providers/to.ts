import { IProvider } from "../_provider";
import { isService, Service } from "../_service";

/** REQUIRES TRANSFORMER - create a provider that resolves to another type */
export function to<T>(): IProvider<T>
/** create a provider that resolves to another symbol */
export function to<T>(service: Service): IProvider<T>
export function to<T>(service?: Service): IProvider<T> {
  if (!isService(service)) throw Error('called "to" without a service symbol');
  return (ctx) => ctx.resolve<T>({service}).first();
}