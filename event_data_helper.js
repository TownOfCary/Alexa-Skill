'use strict';
var _ = require('lodash');
var rp = require('request-promise');
var request = require('request');
var Promise = require('bluebird');
var crypto = require('crypto');
require('./jsDate.js')();
require('datejs');
var HelperClass = require('./helper_functions.js');

function EventDataHelper() { }
// line 254 index
EventDataHelper.prototype.requestEventData = function(uri, startDate, endDate) {
  var self = this;
  var helperClass = new HelperClass();
  return this.calendarEventFind(uri, startDate, endDate).then(function(response) {
    var json = JSON.parse(response);
    // json.PagingList.Content.forEach(function(item){
    //   item.Location = helperClass.EVENTLOCATIONS[item.CategoryID];
    // });
    // return json;
    return self.promiseWhile(uri, json, 0);
  }).catch(function(err) {
    console.log('Error in api call');
    console.log(err);
  });
};

EventDataHelper.prototype.calendarEventFind = function(uri, startDate, endDate){
  var options = { method: 'POST',
    url: uri,
    form: {
      _app_key: process.env.VISIONAPPKEY,
      _format: 'json',
      _method: 'vision.cms.calendarcomponent.event.find',
      _timestamp: new Date().toString('yyyy-MM-dd HH:mm:ss'),
      _v: process.env.VISIONAPPVERSION,
      CategoryIDsConstraint: null,
      DepartmentIDsConstraint: null,
      EndDate: endDate,
      Filter: null,
      PageIndex: '1',
      PageSize: '8',
      StartDate: startDate
   }
  };
  var sign = signAPIRequest(options.form.calendar_find).toUpperCase();
  options.form.calendar_find._sign = sign;
  return rp(options);
}

EventDataHelper.prototype.calendarEventGet = function(uri, id){
  var options = { method: 'POST',
    url: uri,
    form: {
      calendar_get:{
        _app_key: process.env.VISIONAPPKEY,
        _format: 'json',
        _method: 'vision.cms.calendarcomponent.event.get',
        _timestamp: new Date().toString('yyyy-MM-dd HH:mm:ss'),
        _v: process.env.VISIONAPPVERSION,
        Fields: 16,
        ID: id
     }
   }
  };
  var sign = signAPIRequest(options.form.calendar_get).toUpperCase();
  options.form.calendar_get._sign = sign;
  return rp(options);
}

function signAPIRequest(params){
  var returnVal = process.env.VISIONAPPSECRET;
  Object.keys(params).forEach(function(key) {
    if(params[key] !== null){
      returnVal += key + params[key];
    }
  });
  return crypto.createHash('md5').update(returnVal).digest("hex");
}

// promise loop to move to insert location into alexa return
EventDataHelper.prototype.promiseWhile = function(uri, results, i) {
  var self = this;
  return this.calendarEventGet(uri, results.PagingList.Content[i].ID).then(function(response) {
    var json = JSON.parse(response);
    results.PagingList.Content[i].Location = json.Event.Categories[0].Name
    return counter(i)
  }).then(function(response) {
    return (response >= results.PagingList.Content.length) ? results : self.promiseWhile(uri, results, response)
  }).catch(function(err){
    console.log('error on get api call');
    console.log(err);
  });
}

EventDataHelper.prototype.formatEventData = function(sampleReturn) {
  var helperClass = new HelperClass();
  var eventCount = sampleReturn.PagingList.Content.length
  var eventData =[];
  var eventContent = sampleReturn.PagingList.Content
  var response = '';

  if (eventCount === 0 ) {
    return 'There are no scheduled events for that day';
  } else {
    eventContent.forEach(function(item) {
      eventData += _.template('${eventTitle} starts at ${eventStart}, and ends at ${eventEnd} at ${eventLocation}. ')({
        eventStart: helperClass.formatTimeString(Date.parse(item.StartDate)),
        eventEnd: helperClass.formatTimeString(Date.parse(item.EndDate)),
        eventTitle: item.Title,
        eventLocation: item.Location
      });
    });
    response = _.template('On ${date} there are ${count} events: ${eventData}')({
      date: helperClass.formatDate(Date.parse(eventContent[0].StartDate)),
      count: eventCount,
      eventData: eventData
    });

    return response;
  };
}

var counter = Promise.method(function(i){
    return i + 1;
});

module.exports = EventDataHelper;





//
