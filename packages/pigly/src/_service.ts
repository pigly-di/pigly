export type Service = symbol;

export function isService(obj: any): obj is Service {
  return typeof obj === "symbol";
}