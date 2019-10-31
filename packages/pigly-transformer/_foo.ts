export interface IFoo {
  value: string;
  bar: IBar;
}

export interface IBar {
  value: string;
}

export class Foo implements IFoo {
  constructor(public bar: IBar, public value: string) { }
}

export class Bar implements IBar {
  constructor(public value: string){
  }
}