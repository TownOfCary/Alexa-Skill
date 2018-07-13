'use strict';
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var HelperClass = require('../helper_functions.js');
var CASENUMBERLENGTH = 8 //the current number of digits in a case number to add leading zeros
chai.config.includeStack = true;


describe('HelperClass', function() {
  var subject = new HelperClass()
  describe('#formatDateTime', function() {
    context('with a date time', function() {
      var dateTime = Date.parse('Wed Mar 08 2017 14:28:36');
      it('returns date time formated for alexa response', function() {
        var value = subject.formatDateTime(dateTime);
        return expect(value).to.eq('Wed Mar 8 at 02:28:36 PM');
      });
    });
  });
  describe('#formatTimeString', function() {
    context('with a date time', function() {
      var dateTime = Date.parse('Wed Mar 08 2017 14:28:36');
      it('returns time formated in 12 hour time', function() {
        var value = subject.formatTimeString(dateTime);
        return expect(value).to.eq('02:28:36 PM');
      });
    });
  });
  describe('#formatDate', function() {
    context('with a date time', function() {
      var dateTime = Date.parse('Wed Mar 08 2017 14:28:36');
      it('returns time formated in 12 hour time', function() {
        var value = subject.formatDate(dateTime);
        return expect(value).to.eq('Wed Mar 8');
      });
    });
  });
  describe('#addLeadZeros', function() {
    context('with 4 digits', function() {
      var caseNumber = '1234'
      it('returns case number with 4 leading zeros', function() {
        var value = subject.addLeadZeros(caseNumber, CASENUMBERLENGTH);
        return expect(value).to.eq('00001234');
      });
    });
    context('with 8 digits', function() {
      var caseNumber = '12345678'
      it('returns case number with no leading zeros', function() {
        var value = subject.addLeadZeros(caseNumber, CASENUMBERLENGTH);
        return expect(value).to.eq('12345678');
      });
    });
    context('with 0 digits', function() {
      var caseNumber = ''
      it('returns case number with 8 leading zeros', function() {
        var value = subject.addLeadZeros(caseNumber, CASENUMBERLENGTH);
        return expect(value).to.eq('00000000');
      });
    });
  });
});
