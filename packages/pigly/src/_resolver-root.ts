import { IRequest } from "./_request";
import { IResolution } from "./_resolution";

export interface IResolverRoot {
  resolve<T>(request: IRequest): IResolution<T>;
}
