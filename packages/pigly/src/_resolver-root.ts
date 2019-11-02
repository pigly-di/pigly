import { Service } from "./_service";

export interface IResolverRoot {
  resolve<T>(service: Service): T[];
}
