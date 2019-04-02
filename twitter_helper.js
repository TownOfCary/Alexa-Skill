'use strict';
var _ = require('lodash');
var rp = require('request-promise');
var base64 = require('base-64');
require('./jsDate.js')();
require('datejs');
var URI = 'https://api.twitter.com';

class TwitterHelper{

  constructor(){}

  getTweets() {
    var self = this;
    console.log(process.env.TWITTER_CONSUMER_KEY + ':' + process.env.TWITTER_CONSUMER_SECRET);
    var key = base64.encode(process.env.TWITTER_CONSUMER_KEY + ':' + process.env.TWITTER_CONSUMER_SECRET);
    return this.getBearerToken(key).then(function(response) {
      console.log('got response back');
      // console.log(response);
      var json = JSON.parse(response);
      console.log(json);
      return self.getTimeline(json.access_token);
    }).catch(function(err) {
      console.log('Error in api call');
      console.log(err);
    });
  }

  getBearerToken(key) {
    console.log(key)
    var options = {
      method: 'POST',
      url: URI + '/oauth2/token',
      headers: {
        Authorization: 'Basic ' + key,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept-Encoding': 'json'
      },
      body: 'grant_type=client_credentials'
    };
    return rp(options);
  }

  getTimeline(bearerToken) {
    console.log(process.env.TWITTER_MAX_COUNT);
    var options = {
      method: 'GET',
      url: URI + '/1.1/statuses/user_timeline.json',
      headers: {
        Authorization: 'Bearer ' + bearerToken,
        'Accept-Encoding': 'json',
      },
      qs: {
        screen_name: process.env.TWITTER_HANDLE,
        count: process.env.TWITTER_MAX_COUNT,
        exclude_replies: true,
        include_rts: false,
        trim_user: true,
        tweet_mode: 'extended'
      }
    };
    return rp(options);
  }

  formatTweets(tweetData) {
    console.log(tweetData);
    var response = 'The latest Town of Cary Tweets: ';
    tweetData.forEach(function(item) {
      response += _.template("From ${date}, ${text}. ")({
        date: item.created_at,
        text: item.full_text
      });
    });
    return response;
  }

}
module.exports = TwitterHelper;
