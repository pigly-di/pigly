import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

import { Kernel, toClass, toConst, toSelf, injectedInto, when, to } from 'pigly';
import { IFoo } from './service/_foo';

let kernel = new Kernel();

class Foo implements IFoo {
  constructor(public message: string) {
    setInterval(
      () => this.message = message + " " +
        Math.random().toString(), 100);
  }
}

kernel.bind<IFoo>(to<Foo>());
kernel.bind<Foo>(toSelf(Foo))
kernel.bind<string>(
  when(injectedInto<Foo>(),
    toConst("random")))

new Vue({
  provide: {
    "$kernel": kernel
  },
  render: h => h(App),
}).$mount('#app')
