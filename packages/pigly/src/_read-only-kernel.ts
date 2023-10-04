import { IResolverRoot } from "./_resolver-root";
import { Scope } from './_scope';
import { Service } from "./_service";


export interface IReadOnlyKernel extends IResolverRoot {
  get<T>(): T;
  get<T>(service: Service): T;
  getAll<T>(): T[];
  getAll<T>(service: Service): T[];
}