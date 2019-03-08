'use strict';
var _ = require('lodash');
var rp = require('request-promise');
require('./jsDate.js')();
require('datejs');
var Promise = require("bluebird");
var feed = Promise.promisify(require("feed-read-parser"));
const feedparser = require('feedparser-promised');
// const url = 'https://www.townofcary.org/Home/Components/RssFeeds/RssFeed/View?ctID=5&cateIDs=64';
var LIMIT = process.env.RSSLIMIT;
const url = 'https://www.townofcary.org/Home/Components/RssFeeds/RssFeed/View?ctID=5&cateIDs=1%2c2%2c3%2c4%2c5%2c6%2c10%2c11%2c12%2c13%2c14%2c15%2c16%2c17%2c18%2c19%2c20%2c21%2c22%2c53%2c54%2c55%2c59%2c64%2c68%2c123%2c124%2c128%2c131%2c134';
let instance = null;
class RSSFeedHelper{

  constructor() {
    if (instance) return instance;

    instance = this;

    return instance;
  }

  static getInstance() {
    return instance || new SteamBot();
  }

  dateFilter(value) {
    var yesterday = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
    return value.date >= yesterday;
  }

  requestRSSFeed() {
    const httpOptions = {
      uri: url,
      timeout: 5000,
      gzip: true
    };
    const feedparserOptions = {
      feedurl: url,
      normalize: true,
      addmeta: false,
      resume_saxerror: true
    };
    return feedparser.parse(httpOptions, feedparserOptions).then(function (articles){
      // limit number of articles;
      articles = articles.slice(0, LIMIT);
      return articles;
    }).catch(function(e) {
      console.log(e);
    });
  }

  formatRSSFeed(feedData) {
    var response = 'The latest Town of Cary News: ';
    if (feedData[0].title == 'Town of Cary\'s Weekend Update' && feedData[1] == undefined) {
      response = 'Please check Town of Cary dot O R G for the Weekend update';
    } else {
      feedData.forEach(function(item) {
        response += _.template("${rssTitle}. ")({
          rssTitle: item.title,
        });
      });
    }
    return response = response.replace('Town of Cary\'s Weekend Update', 'Please check Town of Cary dot O R G for the Weekend update');
  }

}
module.exports = RSSFeedHelper;
