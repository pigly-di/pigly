import { Kernel, toConst, toClass, toFunc, to,  IContext, when, defer, hasAncestor, IProvider, IBinding } from "../src";
import { expect } from 'chai';
import { Scope } from '../src/_scope';
import { nextTick } from 'process';

function scope<T>(provider: IProvider<T>): IProvider<T> {
  return function (ctx: IContext) {
    return provider(ctx);
  }
}

describe("Kernel Scoping", () => {
  it("can bind to scope and instances within scope are same", (done) => {
    const kernel = new Kernel();

    const $Request = Symbol.for("Req");
    const RequestScope = new class implements Scope {
      private _cache: WeakMap<IContext, WeakMap<IBinding, any>> = new WeakMap();
      getCache(ctx: IContext): WeakMap<IBinding, any> {
        let _ctx = ctx;
        let _current = ctx;
        /** 
         * locate the shallowest context for the request service
         **/
        while (_current != undefined) {
          if (_current.service === $Request) {
            _ctx = _current;
          }
          _current = _current.parent;
        }
        if (_ctx == undefined || _ctx.service !== $Request)
          throw Error("Did not find Request in dependency hierarchy");
        if (this._cache.has(_ctx) == false) {
          this._cache.set(_ctx, new WeakMap());
        }
        return this._cache.get(_ctx);
      }
    }

    const $A = Symbol.for("A");
    const $B = Symbol.for("B");
    const $X = Symbol.for("X");

    class Req { constructor(public a: A, public b: B) { } }
    class A { constructor(public x: X) { } }
    class B { constructor(public x: X) { } }
    class X { public req: Req; constructor() { } }

    /** bind request service within its own scope */
    kernel.bind<Req>($Request, toClass(Req, to<A>($A), to<B>($B)), RequestScope);
    kernel.bind<X>($X, defer(toClass(X), { req: to($Request) }), RequestScope);
    kernel.bind<A>($A, toClass(A, to($X)));
    kernel.bind<B>($B, toClass(B, to($X)));

    let req1 = kernel.get<Req>($Request);
    let req2 = kernel.get<Req>($Request);

    setImmediate(() => {
      //requests are different... 
      expect(req1).not.eq(req2);
      //a and b instances are different... 
      expect(req1.a).not.eq(req2.a);
      expect(req1.b).not.eq(req2.b);
      // x between requests is different...
      expect(req1.a.x).not.eq(req2.a.x);
      expect(req1.b.x).not.eq(req2.b.x);
      // x within requests is same...
      expect(req1.a.x).eq(req1.b.x);
      expect(req2.a.x).eq(req2.b.x);
      //deferred cyclic injection is same
      expect(req1).eq(req1.a.x.req);
      done();
    });
  })
});