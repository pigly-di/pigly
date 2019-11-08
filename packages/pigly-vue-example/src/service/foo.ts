import { IFoo } from './_foo';

export class Foo implements IFoo {
  constructor(public message: string) {
    setInterval(
      () => this.message = message + " " +
        Math.random().toString(), 100);
  }
}