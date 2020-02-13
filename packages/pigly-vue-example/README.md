# pigly-vue-example

Basic example showing how to integrate pigly into a vue app. There are some caveats: 

* by default the vue-cli (plugins) will run the ts-loader in transformOnly mode, this means you cannot use `toSelf` as the pigly transformer cannot get the type information from an import, in this mode. 

* When building, the vue cli will try to use ts-loader's happyPack mode, which means the separate ts-loader instances cannot see the `getCustomTransformers` if its passed as a function - work around is to pass a string that will be `require`'d. 