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
  const kernel = new Kernel();

  class A { constructor(public b: string) { } };
  const a: A = new A("moo");
 
  kernel.bind<typeof a>(toConst(a));

  console.log(kernel.get<typeof a>());
}

console.log(main.toString());

main();

