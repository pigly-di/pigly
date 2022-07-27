import { Kernel, toConst, toSelf, whenAll, named, injectedInto, toClass, to } from 'pigly';

function main() {
  const kernel = new Kernel();

  class A { constructor(public b: string) { } };
  const a: A = new A("moo");
 
  kernel.bind<typeof a>(toConst(a));

  console.log(kernel.get<typeof a>());
}

console.log(main.toString());

main();

