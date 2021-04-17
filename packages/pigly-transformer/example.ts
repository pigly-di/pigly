import { Kernel, toConst, toSelf, whenAll, named, injectedInto, toClass, to } from 'pigly';


class Foo {
  constructor(bar: IBar) { }
}

interface IFoo {
}

interface IBar{

}

class Bar implements IBar{}

function main() {
  let kernel = new Kernel();
  kernel.bind<IBar>(toClass(Bar));
  kernel.bind<IFoo>(toClass(Foo, to<IBar>()));
  console.log(kernel.get<IFoo>());
}

console.log(main.toString());

main();

