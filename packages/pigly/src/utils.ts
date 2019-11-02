
export function first<T>(it: Iterable<T>): T | undefined {
  for (let item of it) {
    return item;
  }
}