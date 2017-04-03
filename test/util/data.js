/**
 * Test data
 */

module.exports ={
  methods: ['get', 'post', 'put', 'del', 'options'],
  getEvent(httpMethod, resource) {
    return { httpMethod, resource };
  }
};
