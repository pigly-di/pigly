export interface Newable0<T> {
  new(): T;
}
export interface Newable1<T, P1> {
  new(p1: P1): T;
}
export interface Newable2<T, P1, P2> {
  new(p1: P1, p2: P2): T;
}
export interface Newable3<T, P1, P2, P3> {
  new(p1: P1, p2: P2, p3: P3): T;
}
export interface Newable4<T, P1, P2, P3, P4> {
  new(p1: P1, p2: P2, p3: P3, p4: P4): T;
}
export interface Newable5<T, P1, P2, P3, P4, P5> {
  new(p1: P1, p2: P2, p3: P3, p4: P4, p5: P5): T;
}
export type Newable<T> = {
  new(...args: any[]): T;
}