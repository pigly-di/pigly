export type Service = symbol;

export function isService(obj): obj is Service{
  return typeof obj === "symbol";
}