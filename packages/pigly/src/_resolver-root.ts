import { IRequest } from "./_request";
import { IResolution } from "./_resolution";
import { Scope } from './_scope';
import { Service } from './_service';

export interface IResolverRoot {
  resolve<T>(request: IRequest): IResolution<T>;
}
