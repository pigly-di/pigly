import { IProvider } from "../_provider";

export function toValue<T>(value: T): IProvider<T> {
  //scoping?
  return (_) => {return value};
}

export function toConst<T>(value: T): IProvider<T> {
  return _ => value;
}