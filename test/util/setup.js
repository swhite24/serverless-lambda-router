/**
 * Setup test environment
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

// Attach expect / sinon to global space
global.expect = chai.expect;
global.sinon = sinon;

// Use sinonChai
chai.use(sinonChai);
