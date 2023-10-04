import { Kernel, toConst, toSelf, whenAll, named, injectedInto, toClass, to } from 'pigly';

function main() {
  const kernel = new Kernel();

  class A { constructor() { } };
 
  kernel.bind(toSelf(A));

  console.log(kernel.get<A>());
}

console.log(main.toString());

main();

