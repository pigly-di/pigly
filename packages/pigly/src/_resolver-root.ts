import { Service } from "./_service";
import { IContext } from "./_context";

export interface IResolverRoot {
  resolve<T>(service: Service, parent?: IContext): Iterable<T>;
}
