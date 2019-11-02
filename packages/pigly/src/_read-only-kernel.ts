import { IResolverRoot } from "./_resolver-root";
import { Service } from "./_service";

export interface IReadOnlyKernel extends IResolverRoot {
  get<T>(): T;
  get(service: Service): any;
  getAll<T>(): T[];
  getAll(service: Service): any[];
}