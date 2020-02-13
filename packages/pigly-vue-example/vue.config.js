const getCustomTransformers = __dirname + "/transformers.js";

module.exports = {
  chainWebpack: config => {
    /**workaround: either disable parallel or move getCustomTransformers to a separate file */
    parallel: false,
    config.module      
      .rule('ts')
      .use('ts-loader')
      .loader('ts-loader')
      .tap(options => {
        // modify the options...
        return { ...options, transpileOnly: true, getCustomTransformers };
      })
  }
}
