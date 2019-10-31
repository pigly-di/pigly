export interface IFoo {
  bar: IBar;
}

export interface IBar {
  value: string;
}

export class Foo implements IFoo {
  constructor(public bar: IBar) { }
}

export class Bar implements IBar {
  constructor(public value: string){
  }
}