import { IResolverRoot } from "./_resolver-root";

export interface IReadOnlyKernel extends IResolverRoot {
  get<T>(): T;
  get(service: symbol): any;
  getAll<T>(): T[];
  getAll(service: symbol): any[];
}