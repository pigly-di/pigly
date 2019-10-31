export interface IFoo {
  bar: IBar<string>;
}

export interface IRay {
  bar: IBar<string>;
}

export interface IBar<T> {}

export class Foo implements IFoo {
  constructor(public bar: IBar<string>) { }
}

export class Ray implements IRay {
  constructor(public bar: IBar<string>) { }
}

export class Bar<T> implements IBar<T> {
  constructor(public value: T){
  }
}