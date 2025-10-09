# Pigly/transformer
[![CI](https://github.com/pigly-di/pigly/actions/workflows/ci.yml/badge.svg)](https://github.com/pigly-di/pigly/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@pigly/transformer)](https://www.npmjs.com/package/@pigly/transformer) [![npm](https://img.shields.io/npm/dm/@pigly/transformer)](https://www.npmjs.com/package/@pigly/transformer) [![codecov](https://codecov.io/gh/pigly-di/pigly/branch/develop/graph/badge.svg)](https://codecov.io/gh/pigly-di/pigly)

the typescript plugin to help emit type symbols for the pigly kernel. 

![alt](https://avatars0.githubusercontent.com/u/50213493?s=400&u=65942b405a979397a2c358366db85c3d06f521f5&v=4)

## Usage

you must use a custom typescript compiler that facilitates using a typescript transformer. see 
https://github.com/cevek/ttypescript

with `@pigly/transformer` transformer active, in your code: 

```
import { SymbolFor } from 'pigly';

let $IFoo = SymbolFor<IFoo>() 
```
...which will get compiled such that `SymbolFor<IFoo>` will be replaced with `symbol.for("...<type hash>")`

currently the transformer is just looking for a method `SymbolFor<T>()` and replaces it with the typescript-id for `T`. Any changes to how this works will result in a major version bump of this package. 

## License
MIT

## Credits

"pig" licensed under CC from Noun Project, Created by habione 404, FR 

@pigly/transformer was derived from https://github.com/YePpHa/ts-di-transformer  (MIT)