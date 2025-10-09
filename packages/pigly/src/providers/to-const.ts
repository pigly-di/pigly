import { IProvider } from "../_provider";

export function toValue<T>(value: T): IProvider<T> {
  //scoping?
  const provider = ((_) => {return value}) as IProvider<T>;

  Object.defineProperty(provider, "meta", {
    value: { name: "toValue" },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return provider;
}

export function toConst<T>(value: T): IProvider<T> {
  const provider = ((_) => value) as IProvider<T>;

  Object.defineProperty(provider, "meta", {
    value: { name: "toConst" },
    enumerable: false,
    configurable: false,
    writable: false
  });

  return provider;
}