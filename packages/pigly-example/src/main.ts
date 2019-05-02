let kernel = {} as any;

interface IFoo { }
interface IBar { }
class Foo implements IFoo {
  constructor(bar: IBar) { }
}
class Bar implements IBar { }

