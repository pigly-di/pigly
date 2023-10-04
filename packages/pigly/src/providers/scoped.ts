import { IContext } from '../_context';
import { IProvider } from '../_provider';
import { Scope } from '../_scope';

/** change the scope of the provider request */
export function scoped<T>(provider: IProvider<T>, scope: Scope): IProvider<T> {
    if (typeof scope != "symbol") throw Error("scope parameter not a valid scope");
    return (ctx: IContext) => {
        return provider(Object.assign({}, ctx, { scope }));
    };
}