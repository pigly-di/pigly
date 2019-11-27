export type Newable<T extends new(...args: any[]) => any> = {
  new(...args: ConstructorParameters<T>): T;
}