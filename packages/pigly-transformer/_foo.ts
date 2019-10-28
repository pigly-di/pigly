export interface IFoo {
  bar: IBar;
}

export interface IBar {}

export class Foo implements IFoo {
  constructor(public bar: IBar) { }
}

export class Bar implements IBar {
  constructor(){
  }
}