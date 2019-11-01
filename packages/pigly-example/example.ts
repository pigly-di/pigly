import { Kernel, toSelf, to } from 'pigly';

interface INinja {
  weapon: IWeapon;
}
interface IWeapon {
  name: string;
}

class Ninja implements INinja {
  constructor(public weapon: IWeapon) { }
}

class Axe implements IWeapon {
  name = "axe";
}

let kernel = new Kernel();

kernel.bind(toSelf(Ninja));
kernel.bind(toSelf(Axe));

kernel.bind<INinja>(to<Ninja>());
kernel.bind<IWeapon>(to<Axe>());

let ninja = kernel.get<INinja>();

console.log(ninja);

