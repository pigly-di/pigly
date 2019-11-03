export interface IResolution<T> extends Iterable<T> {
  toArray(): T[];
  first(): T | undefined;
}
