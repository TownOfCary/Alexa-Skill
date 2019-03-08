'use strict';
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var TwitterHelper = require('../twitter_helper');

describe('TwitterHelper', function() {
  var subject = new TwitterHelper();
  describe('#getTwitterTimeline', function() {
    context('with the ennironment vars', function() {
      it('returns the first 5 tweets', function() {
        var now = Date.now();
        return subject.getTweets().then(function(response) {
          console.log(JSON.parse(response));
          var jsonResponse = JSON.parse(response);
          // console.log(process.env);
          return expect(jsonResponse).to.be.a('array');
        });
      });
    });

  });
  // describe('#formatRSSFeed', function() {
  //   context('with valid utterance from user', function() {
  //     it('returns the latest RSS feed', function() {
  //       var value = subject.formatRSSFeed(sampleReturnWithEvents)
  //       console.log(sampleReturnWithEvents[0].title);
  //       console.log(value);
  //       return expect(value).to.include('The latest Town of Cary News today:');
  //     });
  //   });
  // });
});
