import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false;

import { Kernel, toClass, toConst, toSelf, injectedInto, when, to } from 'pigly';
import { IFoo } from './service/_foo';
import { Foo } from './service/foo';

let kernel = new Kernel();

kernel.bind<IFoo>(to<Foo>());
kernel.bind<Foo>(toClass(Foo, to<string>()))
kernel.bind<string>(
  when(injectedInto<Foo>(),
    toConst("random")))

new Vue({
  provide: {
    "$kernel": kernel
  },
  render: h => h(App),
}).$mount('#app')
