'use strict';
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var RSSFeedHelper = require('../rss_feed_helper');

var sampleReturnWithEvents =
[ { title: 'Town of Cary\'s Weekend Update',
    description: 'Town of Cary’s Planning Director Jeff Ulma to retire March 31, 2017 after decades of service.\r\n    \r\n    \r\n    Cary will conduct a national recruitment.\r\n    \r\n    \r\n    Allan Cain, Cary’s Fire Chief, will serve as Acting Planning...',
    summary: 'Town of Cary’s Planning Director Jeff Ulma to retire March 31, 2017 after decades of service.\r\n    \r\n    \r\n    Cary will conduct a national recruitment.\r\n    \r\n    \r\n    Allan Cain, Cary’s Fire Chief, will serve as Acting Planning...',
    link: 'http://www.townofcary.org/Home/Components/News/News/13048/',
    guid: 'http://www.townofcary.org/Home/Components/News/News/13048/?date=20170329024251',
    author: null,
    comments: null
},
{ title: 'test title'}
];

var sampleBlankReturn =
[

]

describe('RSSFeedHelper', function() {
  var subject = new RSSFeedHelper();
  describe('#requestRSSFeed', function() {
    context('with a valid rss feed', function() {
      it('returns the parsed rss object', function() {
        this.timeout(10000);
        var now = Date.now();
        return subject.requestRSSFeed().then(function(response) {
          // console.log(response);
          console.log(Date.now() - now);
          return expect(response).to.be.a('array');
        });
      });
    });

  });
  describe('#formatRSSFeed', function() {
    context('with valid utterance from user', function() {
      it('returns the latest RSS feed', function() {
        var value = subject.formatRSSFeed(sampleReturnWithEvents)
        console.log(sampleReturnWithEvents[0].title);
        console.log(value);
        return expect(value).to.include('The latest Town of Cary News today:');
      });
    });
    // context('with a blank rss feed response', function() {
    //   it('returns no new items to report', function() {
    //     var value = subject.formatRSSFeed()
    //     expect(value).to.include('There are no news items to report at this time.');
    //   });
    // });
  });
});
