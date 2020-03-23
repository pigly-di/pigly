import { IProvider } from "../_provider";

export function maybe<T>(provider: IProvider<T>, fallback: T) {
  return (ctx) => {
    try {
      return provider(ctx);
    } catch (err) {
      return fallback;
    }
  }
}