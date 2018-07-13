'use strict';
const _ = require('lodash');
const rp = require('request-promise');
const HelperClass = require('./helper_functions.js');
const promise = require('bluebird');
const promisify = require('util').promisify;
require('./jsDate.js');
require('datejs');
const FIELDSTATUSENDPOINT = 'http://games.townofcarync.gov';
const FIELDTYPES = ['/ballfields/ballfields.txt', '/multipurposefields/multipurposefields.txt', '/gymnasiums/gymnasiums.txt', '/soccerpark/soccerpark.txt', '/usabaseball/usabaseball.txt'];
let instance = null;

class FieldStatusHelper{

  constructor() {
    if (instance) return instance;

    instance = this;

    return instance;
  }

  static getInstance() {
    return instance || new SteamBot();
  }

  get FIELDSTATUSENDPOINT() {
    return FIELDSTATUSENDPOINT;
  };

  get FIELDTYPES() {
    return FIELDTYPES;
  };


getAllFieldStatus(){
  var results = {};
  return this.promiseLoop(results, 0).then(function(response){
    return response
  });
}

requestFieldStatus(uri){
  var options = {
    method: 'GET',
    uri: encodeURI(uri),
    resolveWithFullResponse: true,
    timeout: 3000
  };
  return rp(options);
}

promiseLoop(results, i){
  var helperClass = new HelperClass();
  var self = this;
  return this.requestFieldStatus(FIELDSTATUSENDPOINT + FIELDTYPES[i]).then(function(response){
    return helperClass.addFieldResults(response.body, results);
  }).then(function(response){
    i++;
    return (i >= FIELDTYPES.length) ? response : self.promiseLoop(response, i);
  });
}

formatFieldStatus(fieldStatus, parkQuery){
  var prompt;
  var helperClass = new HelperClass();
  var parkName = helperClass.FIELDNAMEPAIRINGS[parkQuery.toUpperCase()] || parkQuery.toUpperCase();
  if(fieldStatus[parkName].closed.length <= 0){
      prompt = _.template('All fields at ${park} are currently open')({
        park: parkName
      });
  } else {
    if(fieldStatus[parkName].open.length <= 0){
      prompt = _.template('All fields at ${park} are currently closed')({
        park: parkName
      });
    } else {
      var closedFields = fieldStatus[parkName].closed.join(', ')
      prompt = _.template('At ${park}, the following list of facilities are closed. ${fields}')({
        park: parkName,
        fields: closedFields
      });
    }
  }
  return prompt;
}

counter(i){
  return Promise.method(function(i) {
      return i + 1;
  });
}
}
module.exports = FieldStatusHelper;
