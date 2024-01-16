import { IProvider } from "../_provider";

/** 
 * names the target site - child providers can then predicate on (parent) name. 
 * note: js strict mode disallows access to constructor field names
 **/
export function name<T>(name: string, provider: IProvider<T>): IProvider<T> {
  return (context) => {
    context.target = name; 
    return provider(context);
  }
}