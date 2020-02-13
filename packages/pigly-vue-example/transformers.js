/** ts-loader happy-pack work-around */

const pigly = require('@pigly/transformer').default;

module.exports = (program) => {
  return {
    before: [pigly(program)]
  }
}