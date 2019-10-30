export interface IResolverRoot {
  resolve<T>(service: symbol): T[];
}
