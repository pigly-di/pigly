const pigly = require('@pigly/transformer').default;

const transformers = (program) => {
  return {
    before: [pigly(program)]
  }
}


module.exports = {
  chainWebpack: config => {
    config.module
      .rule('ts')
      .use('ts-loader')
      .loader('ts-loader')
      .tap(options => {
        // modify the options...
        return { ...options, getCustomTransformers: transformers, logLevel: "info" };
      })
  }
}
