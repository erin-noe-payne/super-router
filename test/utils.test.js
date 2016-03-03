'use strict';
const chai              = require('chai');
const sinon             = require('sinon');
const sinonChai         = require('sinon-chai');
const sinonStubPromises = require('sinon-promises');
const chaiAsPromised    = require('chai-as-promised');
const _       = require('lodash');

sinonStubPromises(sinon);
chai.use(chaiAsPromised);
chai.use(sinonChai);

const expect = chai.expect;
const utils = require('./../lib/utils');

describe('Utils', () => {
  describe('normalizePath', () => {
    const testCases = [
      { in : '/test/test/test', out : '/test/test/test' },
      { in : '/test/test/test/', out : '/test/test/test' },
      { in : '/test/test/test//////', out : '/test/test/test' },
      { in : '/BoGgle/At/the/SitUation', out : '/boggle/at/the/situation' },
      { in : '/BoGgle/At/the/:SitUation', out : '/boggle/at/the/:SitUation' },
      { in : '/test/test?Key1=Value1', out : '/test/test?Key1=Value1' },
      { in : '/something?Key1=Value1&Key2=Value2', out : '/something?Key1=Value1&Key2=Value2' },
      { in : '/something/:ID/ActiOn?Key1=Value1&Key2=Value2', out : '/something/:ID/action?Key1=Value1&Key2=Value2' },
      { in : '/something/:ID/ActiOn/////////?Key1=Value1&Key2=Value2', out : '/something/:ID/action?Key1=Value1&Key2=Value2' },
    ];

    _.forEach(testCases, (testCase) => {
      it(`testCase: ${testCase.in}`, () => {
          expect(utils.normalizePath(testCase.in)).to.equal(testCase.out);
      });
    });

  });

});
