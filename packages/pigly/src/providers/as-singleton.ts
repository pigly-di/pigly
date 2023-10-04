import { IProvider } from "../_provider";
import { IContext } from "../_context";

export function asSingleton<T>(provider: IProvider<T>) {
  return provider;
}
