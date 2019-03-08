'use strict';
module.change_code = 1;
process.env.TZ = 'America/New_York';
var AmazonHelpers = require('./amazon_helpers.js')
var _ = require('lodash');
var Alexa = require('alexa-sdk');
var OpenDataHelper = require('./open_data_helper');
var EsriDataHelper = require('./esri_data_helper');
var SalesforceHelper = require('./salesforce_helper');
var FieldStatusHelper = require('./field_status_helper');
var HelperClass = require('./helper_functions.js');
var EventDataHelper = require('./event_data_helper');
var rp = require('request-promise');
var RSSFeedHelper = require('./rss_feed_helper');
var TwitterHelper = require('./twitter_helper');
require('./jsDate.js')();


var facts = require('./cary_facts');
var issues = require('./case_issues');
var ESRIENDPOINT = 'https://maps.townofcary.org/arcgis1/rest/services/';
var ARCGISENDPOINT = 'https://services2.arcgis.com/l4TwMwwoiuEVRPw9/ArcGIS/rest/services/';
var OPENDATAENDPOINT = 'https://data.townofcary.org/api/records/1.0/search/?';
var EVENTDATAENDPOINT = 'http://www.townofcary.org/API'; // still waiting on vision to get this set properly
var RSSFEEDENDPOINT = 'http://www.townofcary.org/Home/Components/RssFeeds/RssFeed/View?ctID=5&cateIDs=1%2c2%2c3%2c4%2c5%2c6%2c10%2c11%2c12%2c13%2c14%2c15%2c16%2c17%2c18%2c19%2c20%2c21%2c22%2c53%2c54%2c55%2c59%2c64';
var DISTANCE = 1; //distance for radius search.  currently 1 mile can be adapted later.
var APP_ID = process.env.ALEXAAPPID;  // TODO replace with your app ID (OPTIONAL).
var CASENUMBERLENGTH = 8; //the current number of digits in a case number to add leading zeros
//If false, it means that Account Linking isn't mandatory there fore we dont have accaes to the account of the community user so we will ask for the user's Phone Number.
// IMPORTANT!! Make sure that the profile of the community user has the 'API Enabled' field marked as true.
var ACCOUNT_LINKING_REQUIRED = true;
var APP_STATES = {
  COUNCIL: '_COUNCIL', // Asking for users address
  PARKS: '_PARKS',
  ART: '_ART',
  CASE: '_CASE',
  TRASH: '_TRASH',
};

var welcomeMessage = 'Welcome to the Town of Cary Alexa skill.  If you need help with your options please say help. What can I help you with today?';
var welcomeReprompt = 'If you need help with your options please say help.  What can I do for you today?';

var helpMessage = 'To report a case to the town you can say something like I need help with leaf collection or I need help with missed trash.  For information you can ask for open gym times for a date, what parks are nearby, who is your council member or a fact about cary.  For a full list please check the card sent to your alexa app. What can I help you with today?';
var helpMessageReprompt = 'What can I help you with today?';
var helpMesssageCard = 'Sample questions:\nCases: What is my case status?\nI need to create a case.\nI need help with {case issue}\nInformation: Tell me a fact about Cary.\nWhat is the latest news?\nWhat is happening in Cary on {day}?\nWhat are the Town Hall hours for {day}?\nWhat is the field status at {park}?\nWho is my council member?\nWho is on the city council?\nWho is the mayor?\nWhat are the open gym times for {day}\nWhen is the next Open Studio?\nWhat are the open Studio times for {day}?\nWhat parks are nearby?\n';

var CASEISSUES = ['Broken Recycling', 'Broken Trash', 'Cardboard Collection', 'Leaf Collection', 'Missed Recycling', 'Missed Trash', 'Missed Yard Waste', 'Oil Collection', 'Upgrade Recycling', 'Upgrade Trash', 'Yard Waste Collection'];
var GYMLOCATIONS = {'BOND PARK': 'BPCC', 'HERBERT YOUNG': 'HYCC', 'HERB YOUNG': 'HYCC', 'HERBERT C. YOUNG': 'HYCC', 'MIDDLE CREEK': 'MCCC'};

exports.handler = function(event, context, callback) {
  var alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID;
  alexa.registerHandlers(newSessionHandlers, councilHandlers, parkHandlers, artHandlers, caseHandlers, trashHandlers);
  alexa.execute();
};

var newSessionHandlers = {
  'LaunchRequest': function () {
    var intentTrackingID = ua(GOOGLE_STATE_IDS.BASE, this.event.session.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event("LaunchIntent","Success", JSON.stringify(this.event.session)).send();
    console.log(JSON.stringify(this.event.context.System));
    sendOutput(this, ':ask', welcomeMessage, welcomeReprompt);
  },

  'GetByAddressIntent': function(){
    var prompt = 'If you require assistance with the skill please ask for help.';
    sendOutput(this, ':tell', prompt);
  },

  'OpenGymTimesIntent': function () {
    var self = this;
    var gymTimeDate = this.event.request.intent.slots.Date.value || Date.yyyymmdd(Date.today());
    var location = this.event.request.intent.slots.location.value;
    if(location !== undefined){
      location = location.toUpperCase();
    }
    var prompt = '';

    if(gymTimeDate.search(/^\d{4}-\d{2}-\d{2}$/) == -1){
      prompt = 'Please choose a single day for open gym times.';
      sendOutput(self, ':ask', prompt);
      return;
    }
    var openDataHelper = new OpenDataHelper();

    var q = '';
    if(location === undefined){
      q = 'date_scanned==' + gymTimeDate;
    } else {
      q = 'date_scanned==' + gymTimeDate + ' AND community_center==' + GYMLOCATIONS[location.toUpperCase()];
    }
    var uri = OPENDATAENDPOINT + 'dataset=open-gym&q=' + q + '&facet=community_center&timezone=America/New_York&exclude.community_center=CAC';
    openDataHelper.requestOpenData(uri).then(function(gymTimeStatus) {
      console.log(gymTimeStatus.records);
      return openDataHelper.formatGymTimes(gymTimeStatus);
    }).then(function(response){
      sendOutput(self, ':tell', response);
    }).catch(function(err) {
      prompt = 'I didn\'t have data for gym times on ' + gymTimeDate;
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'OpenStudioTimesIntent': function () {
    var self = this;
    var studioTimeDate = this.event.request.intent.slots.Date.value || Date.yyyymmdd(Date.today());
    var prompt = '';

    if(studioTimeDate.search(/^\d{4}-\d{2}-\d{2}$/) == -1){
      prompt = 'Please choose a single day for open studio times.';
      sendOutput(self, ':ask', prompt);
      return;
    }
    var openDataHelper = new OpenDataHelper();

    var uri = OPENDATAENDPOINT + 'dataset=open-gym&q=open_gym_start==' + studioTimeDate + '&facet=community_center&timezone=America/New_York&refine.community_center=CAC';
    openDataHelper.requestOpenData(uri).then(function(studioTimeStatus) {
      console.log(studioTimeStatus.records);
      return openDataHelper.formatStudioTimes(studioTimeStatus);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err) {
      prompt = 'I didn\'t have data for studio times on ' + studioTimeDate;
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'NextOpenStudioIntent': function () {
    var self = this;
    var prompt = '';
    var openDataHelper = new OpenDataHelper();
    var studioTimeDate = new Date().toString('yyyy-MM-ddTHH:mm:ss');
    var uri = OPENDATAENDPOINT + 'dataset=open-gym&q=open_gym_start>=' + studioTimeDate + '&facet=community_center&rows=1&sort=-date_scanned&timezone=America/New_York&refine.community_center=CAC';
    openDataHelper.requestOpenData(uri).then(function(studioTimeStatus) {
      console.log(studioTimeStatus.records);
      return openDataHelper.formatNextStudioTime(studioTimeStatus);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err) {
      prompt = 'I didn\'t have data for studio times on ' + studioTimeDate;
      console.log(err);

      sendOutput(self, ':tell', prompt);
    });
  },

  'GetCaryFactsIntent': function () {
    var index = Math.floor(Math.random() * facts['facts'].length);
    var prompt = facts['facts'][index];

    sendOutput(this, ':tell', prompt);
  },

  'MyCouncilMemberIntent': function() {
    getUserAddress(this.event.session.user.accessToken, APP_STATES.COUNCIL, 'GetCouncilInfoIntent', this);
  },

  'NearbyParksIntent': function() {
    getUserAddress(this.event.session.user.accessToken, APP_STATES.PARKS, 'GetParkInfoIntent', this);
  },

  'NearbyPublicArtIntent': function() {
    getUserAddress(this.event.session.user.accessToken, APP_STATES.ART, 'GetPublicArtInfoIntent', this);
  },

  'TrashDayIntent': function(){
    getUserAddress(this.event.session.user.accessToken, APP_STATES.TRASH, 'GetTrashDayIntent', this);
  },

  'AllCouncilMembersIntent': function() {
    var prompt = '';
    var self = this;
    var openDataHelper = new OpenDataHelper();
    var uri = OPENDATAENDPOINT + 'dataset=council-districts&q=county==wake&sort=name&facet=at_large_representatives';
    openDataHelper.requestOpenData(uri).then(function(response) {
      return openDataHelper.formatAllCouncilMembers(response);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err) {
      prompt = 'There seems to be a problem with the connection right now.  Please try again later';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'AtLargeCouncilMembersIntent': function() {
    var prompt = '';
    var self = this;
    var openDataHelper = new OpenDataHelper();
    var uri = OPENDATAENDPOINT + 'dataset=council-districts&q=county==wake&sort=name&facet=at_large_representatives';
    openDataHelper.requestOpenData(uri).then(function(response) {
      return openDataHelper.formatAtLargeCouncilMembers(response);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err) {
      prompt = 'There seems to be a problem with the connection right now.  Please try again later';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'MyMayorIntent': function() {
    var prompt = '';
    var self = this;
    var openDataHelper = new OpenDataHelper();
    var uri = OPENDATAENDPOINT + 'dataset=council-districts&q=county==wake&sort=name&facet=at_large_representatives';
    openDataHelper.requestOpenData(uri).then(function(response) {
      return openDataHelper.formatMayor(response);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err) {
      prompt = 'There seems to be a problem with the connection right now.  Please try again later';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'CaseStartIntent': function() {
    var self = this;
    console.log(self.event.session.user.accessToken);
    if(ACCOUNT_LINKING_REQUIRED === true && self.event.session.user.accessToken === undefined) {
      var speechOutput = "You must link your account before accessing this skill.";
      var prompt = scrub(speechOutput);
      self.attributes["speechOutput"] = prompt;
      self.emit(':tellWithLinkAccountCard', prompt);
    } else {
      var prompt = "OK, let's create a new Case. What do you need help with?";
      var reprompt = 'For a list of options please say help.  What do you need help with?';
      self.handler.state = APP_STATES.CASE;
      sendOutput(self, ':ask', prompt, reprompt);
    }
  },

  'CaseConfirmationIntent': function() {
    var helperClass = new HelperClass();
    var self = this;
    if(ACCOUNT_LINKING_REQUIRED === true && self.event.session.user.accessToken === undefined) {
      var speechOutput = "You must link your account before accessing this skill.";
      var prompt = scrub(speechOutput);
      self.attributes["speechOutput"] = prompt;
      self.emit(':tellWithLinkAccountCard', speechOutput);
    } else {
      var caseSubject = self.event.request.intent.slots.caseSubject.value;
      var caseAction = self.event.request.intent.slots.caseAction.value || helperClass.addCaseAction(caseSubject);
      if(caseSubject === undefined || caseAction === undefined){
        self.handler.state = APP_STATES.CASE;
        self.emitWithState('Unhandled', true);
      } else {
        self.attributes['caseIssue'] = issues[caseSubject.toUpperCase().replace(/-/g, '') + ' ' + caseAction.toUpperCase().replace(/-/g, '')];
        console.log(self.attributes);
        self.handler.state = APP_STATES.CASE;
        self.emitWithState('CaseConfirmationIntent', true);
      }
    }
  },

  'MyCaseStatusIntent': function() {
    var self = this;
    var helperClass = new HelperClass();
    if(ACCOUNT_LINKING_REQUIRED === true && this.event.session.user.accessToken === undefined) {
      var speechOutput = "You must link your account before accessing this skill.";
      speechOutput = scrub(speechOutput);
      self.attributes["speechOutput"] = speechOutput;
      self.emit(':tellWithLinkAccountCard', speechOutput);
    } else {
      var salesforceHelper = new SalesforceHelper();
      var userToken = this.event.session.user.accessToken;
      var caseSubject = helperClass.formatCaseSubject(this.event.request.intent.slots.caseSubject.value);
      var caseAction = this.event.request.intent.slots.caseAction.value || helperClass.addCaseAction(caseSubject);
      var prompt = '';
      salesforceHelper.findLatestCaseStatus(userToken, CASEISSUES.find(checkCaseIssue, {"caseSubject": caseSubject, "caseAction": caseAction})).then(function(response) {
        console.log(response);
        return salesforceHelper.formatExistingCase(response);
      }).then(function(response) {
        prompt = scrub(response.prompt);
        self.attributes["speechOutput"] = prompt;
        self.emit(':tellWithCard', prompt, 'Town of Cary Case', response.card);
      }).catch(function(err){
        prompt = 'There seems to be a problem with the connection right now.  Please try again later';
        console.log(err);
        sendOutput(self, ':tell', prompt);
      });
    }
  },

  'CaseStatusIntent': function() {
    var self = this;
    if(ACCOUNT_LINKING_REQUIRED === true && this.event.session.user.accessToken === undefined) {
      var speechOutput = "You must link your account before accessing this skill.";
      self.attributes["speechOutput"] = prompt;
      self.emit(':tellWithLinkAccountCard', speechOutput);
    } else {
      var helperClass = new HelperClass();
      var salesforceHelper = new SalesforceHelper();
      var userToken = this.event.session.user.accessToken;
      var caseNumber = this.event.request.intent.slots.CaseNumber.value;
      if(caseNumber.length < CASENUMBERLENGTH){
        caseNumber = helperClass.addLeadZeros(caseNumber, CASENUMBERLENGTH);
      }
      var prompt = '';
      salesforceHelper.findCaseStatus(userToken, caseNumber).then(function(response) {
        console.log(response)
        if(response.length <= 0){
          sendOutput(self, ':tell', 'I could not find a case with that number on your account.  Please double check your case number.');
        }
        return salesforceHelper.formatExistingCase(response);
      }).then(function(response) {
        prompt = scrub(response.prompt);
        self.attributes["speechOutput"] = prompt;
        self.emit(':tellWithCard', prompt, 'Town of Cary Case', response.card);
      }).catch(function(err){
        prompt = 'There seems to be a problem with the connection right now.  Please try again later';
        console.log(err);
        sendOutput(self, ':tell', prompt);
      });
    }
  },

  'TownHallHoursIntent': function(){
    var userToken = this.event.session.user.accessToken;
    var salesforceHelper = new SalesforceHelper();
    var date = this.event.request.intent.slots.Date.value || Date.yyyymmdd(Date.today());
    var self = this;
    var prompt = '';
    if(date.search(/^\d{4}-\d{2}-\d{2}$/) == -1){
      prompt = 'Please choose a single day for town hall hours.';
      sendOutput(self, ':ask', prompt);
      return;
    }
    salesforceHelper.getTownHallHours(userToken, date).then(function(response){
      return salesforceHelper.formatTownHallHours(response, date);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err){
      prompt = 'There seems to be a problem with the connection right now.  Please try again later';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'UpcomingCaryEventsIntent': function() {
    var date = this.event.request.intent.slots.Date.value || Date.yyyymmdd(Date.today());
    var self = this;
    var prompt = '';
    if(date.search(/^\d{4}-\d{2}-\d{2}$/) == -1){
      var prompt = 'Please choose a single day for a list of events.';
      sendOutput(self, ':ask', prompt);
      return;
    }

    var startDate = date + 'T00:00:00';
    var endDate = date + 'T23:59:59';
    var uri = EVENTDATAENDPOINT;
    var eventDataHelper = new EventDataHelper();
    eventDataHelper.requestEventData(uri, startDate, endDate).then(function(response){
      console.log(response);
      return eventDataHelper.formatEventData(response);
    }).then(function(response){
      console.log(response);
      prompt = scrub(response);
      console.log(prompt);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err){
      console.log('error in events retrieval');
      console.log(err);
      var prompt = 'I\'m sorry, there was an error in finding events.';
      sendOutput(self, ':tell', response);
    });
  },


  'FieldStatusIntent': function() {
    var helperClass = new HelperClass();
    var parkName = this.event.request.intent.slots.park.value;
    var prompt = '';
    var self = this;
    console.log(this.event.request.intent);
    if(parkName === undefined || helperClass.FIELDNAMEPAIRINGS[parkName.toUpperCase()] === undefined){
      prompt = 'I\'m sorry I did not recognize that field name.';
      sendOutput(self, ':tell', prompt);
    }
    var fieldStatusHelper = new FieldStatusHelper();
    fieldStatusHelper.getAllFieldStatus().then(function(response){
      return fieldStatusHelper.formatFieldStatus(response, parkName);
    }).then(function(response){
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err){
      console.log(err);
      prompt = 'I\'m sorry, there seems to be a problem with the connection right now.';
      sendOutput(self, ':tell', prompt);
    });
  },

  'RSSFeedIntent': function() {
    var prompt = '';

    var rssFeedHelper = new RSSFeedHelper();
    var self = this;

    rssFeedHelper.requestRSSFeed().then(function(response) {
      return rssFeedHelper.formatRSSFeed(response);
    }).then(function(response) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err){
      prompt = 'I\'m sorry, there seems to be a problem with the connection right now.';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'TwitterIntent': function() {
    var prompt = '';
    console.log('IN TWITTER INTENT');
    var twitter_helper = new TwitterHelper();
    var self = this;

    twitter_helper.getTweets().then(function(response) {
      return twitter_helper.formatTweets(response);
    }).then(function(response) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(err){
      prompt = 'I\'m sorry, there seems to be a problem with the connection right now.';
      console.log(err);
      sendOutput(self, ':tell', prompt);
    });
  },

  'AMAZON.RepeatIntent': function () {
    var prompt = AmazonHelpers.RepeatIntent(this.event.session.user.userId, this.event.request, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.HelpIntent': function() {
    var prompt = AmazonHelpers.HelpIntent(this.event, this.attributes,'');
    this.emit(':askWithCard', helpMessage, helpMessageReprompt, 'Town of Cary Help Index', helpMesssageCard);
  },

  'AMAZON.StopIntent': function () {
    var prompt = AmazonHelpers.StopIntent(this.event,this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function () {
    var prompt = AmazonHelpers.CancelIntent(this.event, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function () {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
};

var councilHandlers = Alexa.CreateStateHandler(APP_STATES.COUNCIL, {

  'GetByAddressIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var street_number = this.event.request.intent.slots.street_number.value;
    var street = this.event.request.intent.slots.street.value;
    var address = street_number + ' ' + street
    var prompt = '';
    esriDataHelper.requestAddressInformation(address).then(function(response) {
      var uri = ESRIENDPOINT + 'Elections/Elections/MapServer/identify?geometry=' + response.candidates[0].location.x + ',' + response.candidates[0].location.y + '&geometryType=esriGeometryPoint&sr=4326&layers=all&layerDefs=&time=&layerTimeOptions=&tolerance=2&mapExtent=-79.193,35.541,-78.63,35.989&imageDisplay=600+550+96&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&dynamicLayers=&returnZ=false&returnM=false&gdbVersion=&f=pjson';
      return esriDataHelper.requestESRIInformation(uri);
    }).then(function(response){
      return esriDataHelper.formatMyCouncilMember(response);
    }).then(function(response) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(error){
      prompt = 'I could not find any information for ' + address;
      console.log(error);
      sendOutput(self, ':tell', prompt);
    });
  },

  'GetCouncilInfoIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var address = this.attributes['address'];
    var uri = ESRIENDPOINT + 'Elections/Elections/MapServer/identify?geometry=' + address.x + ',' + address.y + '&geometryType=esriGeometryPoint&sr=4326&layers=all&layerDefs=&time=&layerTimeOptions=&tolerance=2&mapExtent=-79.193,35.541,-78.63,35.989&imageDisplay=600+550+96&returnGeometry=false&maxAllowableOffset=&geometryPrecision=&dynamicLayers=&returnZ=false&returnM=false&gdbVersion=&f=pjson';
    esriDataHelper.requestESRIInformation(uri).then(function(response){
      return esriDataHelper.formatMyCouncilMember(response);
    }).then(function(response) {
      sendOutput(self, ':tell', response);
    }).catch(function(error){
      console.log(error);
      var prompt = 'I could not find any information at your location.  Would you like to try another address?';
      var reprompt = 'Would you like to try searching at another address?';
      sendOutput(self, ':ask', prompt, reprompt);
    });
  },

  'AMAZON.YesIntent': function() {
    var prompt = AmazonHelpers.YesIntent(this.event, this.attributes, 'your council information');
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.NoIntent': function() {
    var prompt = AmazonHelpers.NoIntent(this.event,this.attributes);
    sendOutput(this,prompt.type,prompt.text);
  },

  'AMAZON.RepeatIntent': function () {
    var prompt = AmazonHelpers.RepeatIntent(this.event.session.user.userId, this.event.request, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.HelpIntent': function() {
    var prompt = AmazonHelpers.HelpIntent(this.event, this.attributes,'your council information');
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.StopIntent': function () {
    var prompt = AmazonHelpers.StopIntent(this.event, this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function () {
    var prompt = AmazonHelpers.CancelIntent(this.event, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function () {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
});

var parkHandlers = Alexa.CreateStateHandler(APP_STATES.PARKS, {

  'GetByAddressIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var reprompt = 'Please tell me your address so I can look up nearby parks.';
    var street_number = this.event.request.intent.slots.street_number.value;
    var street = this.event.request.intent.slots.street.value;
    var address = street_number + ' ' + street
    var prompt = '';
    esriDataHelper.requestAddressInformation(address).then(function(response) {
      var uri = ESRIENDPOINT + 'ParksRec/Parks/FeatureServer/0/query';
      return esriDataHelper.requestInformationByRadius(response.candidates[0].location.x, response.candidates[0].location.y, DISTANCE, uri);
    }).then(function(response){
      return esriDataHelper.formatNearbyParks(response);
    }).then(function(responseresponse) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(error){
      prompt = 'I could not find any parks near ' + address;
      sendOutput(self, ':tell', prompt);
    });
  },

  'GetParkInfoIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var address = this.attributes['address'];
    console.log(address);
    var uri = ESRIENDPOINT + 'ParksRec/Parks/FeatureServer/0/query';
    var prompt = '';
    esriDataHelper.requestInformationByRadius(address.x, address.y, DISTANCE, uri).then(function(response){
      return esriDataHelper.formatNearbyParks(response);
    }).then(function(response) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(error){
      console.log(error);
      var prompt = 'I could not find any parks near your location.  Would you like to try another address?';
      var reprompt = 'Would you like to try searching at another address?';
      sendOutput(self, ':ask', prompt, reprompt);
    });
  },

  'AMAZON.YesIntent': function() {
    var prompt = AmazonHelpers.YesIntent(this.event, this.attributes,'nearby parks');
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.NoIntent': function() {
    var prompt = AmazonHelpers.NoIntent(this.event, this.attributes);
    sendOutput(this,prompt.type,prompt.text);
  },

  'AMAZON.RepeatIntent': function () {
    var prompt = AmazonHelpers.RepeatIntent(this.event.session.user.userId, this.event.request, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.HelpIntent': function() {
    var prompt = AmazonHelpers.HelpIntent(this.event, this.attributes,'nearby parks');
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.StopIntent': function () {
    var prompt = AmazonHelpers.StopIntent(this.event, this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function () {
    var prompt = AmazonHelpers.CancelIntent(this.event, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function () {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
});

var artHandlers = Alexa.CreateStateHandler(APP_STATES.ART, {

  'GetByAddressIntent': function() {
    var intentTrackingID = ua(GOOGLE_STATE_IDS.ART, this.event.session.user.userId, {strictCidFormat: false, https: true});
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var reprompt = 'Please tell me your address so I can look up nearby public art.';
    var street_number = this.event.request.intent.slots.street_number.value;
    var street = this.event.request.intent.slots.street.value;
    var address = street_number + ' ' + street
    var prompt = '';
    esriDataHelper.requestAddressInformation(address).then(function(response) {
      var uri = ARCGISENDPOINT + 'Art_in_Public_Places/FeatureServer/0/query?where=&objectIds=&time=&geometry=' + response.candidates[0].location.x + ',' + response.candidates[0].location.y + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelContains&resultType=none&distance=1000&units=esriSRUnit_Meter&returnGeodetic=false&outFields=*&returnGeometry=true&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnDistinctValues=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&quantizationParameters=&sqlFormat=none&f=pjson';
      return esriDataHelper.requestESRIInformation(uri);
    }).then(function(response){
      return esriDataHelper.formatNearbyPublicArt(response);
    }).then(function(response) {
      intentTrackingID.event("GetByAddressIntent","Success","Request: " + JSON.stringify(self.event.request) + " Attributes: " + JSON.stringify(self.attributes)).send();
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(error){
      prompt = 'I could not find any public art near ' + address;
      intentTrackingID.event("GetByAddressIntent","Failure","Request: " + JSON.stringify(self.event.request) + " Attributes: " + JSON.stringify(self.attributes) + " Err: " + err).send();
      sendOutput(self, ':tell', prompt);
    });
  },

  'GetPublicArtInfoIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var address = this.attributes['address'];
    var prompt = '';
    var uri = ARCGISENDPOINT + 'Art_in_Public_Places/FeatureServer/0/query?where=&objectIds=&time=&geometry=' + address.x + ',' + address.y + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelContains&resultType=none&distance=1000&units=esriSRUnit_Meter&returnGeodetic=false&outFields=*&returnGeometry=true&multipatchOption=xyFootprint&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&returnExtentOnly=false&returnDistinctValues=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&resultOffset=&resultRecordCount=&returnZ=false&returnM=false&quantizationParameters=&sqlFormat=none&f=pjson';
    esriDataHelper.requestESRIInformation(uri).then(function(response){
      return esriDataHelper.formatNearbyPublicArt(response);
    }).then(function(response) {
      prompt = scrub(response);
      sendOutput(self, ':tell', prompt);
    }).catch(function(error){
      console.log(error);
      var prompt = 'I could not find any public art near your location.  Would you like to try another address?';
      var reprompt = 'Would you like to try searching at another address?';
      sendOutput(self, ':ask', prompt, reprompt);
    });
  },

  'AMAZON.YesIntent': function() {
    var prompt = AmazonHelpers.YesIntent(this.event, this.attributes, 'public art');
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.NoIntent': function() {
    var prompt = AmazonHelpers.NoIntent(this.event, this.attributes);
    sendOutput(this,prompt.type,prompt.text);
  },

  'AMAZON.RepeatIntent': function () {
    var prompt = AmazonHelpers.RepeatIntent(this.event.session.user.userId, this.event.request, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.HelpIntent': function() {
    var prompt = AmazonHelpers.HelpIntent(this.event, this.attributes,'nearby public art');
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.StopIntent': function () {
    var prompt = AmazonHelper.StopIntent(this.event, this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function () {
    var prompt = AmazonHelpers.CancelIntent(this.event, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function () {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
});

var caseHandlers = Alexa.CreateStateHandler(APP_STATES.CASE, {
  'CreateCaseIntent': function () {
    var userToken = this.event.session.user.accessToken;
    var salesforceHelper = new SalesforceHelper();
    var caseIssue =  this.attributes["caseIssue"];
    var prompt = '';
    var self = this;
    salesforceHelper.createCaseInSalesforce(userToken, caseIssue).then(function(response){
      if(response === undefined){
        prompt = 'There was an error connecting to Salesforce.  Please try again later or contact Public Works at 919 469 4090';
        console.log(err);

        sendOutput(self, ':tell', prompt);
        return undefined;
      } else {
        self.attributes['case'] = response;
        self.attributes['caseIssue'] = response.Case_Issue_Name__c;
        return salesforceHelper.formatNewCaseStatus(response);
      }
    }).then(function(response){
      prompt = scrub(response.prompt);
      self.attributes["speechOutput"] = prompt;
      self.emit(':tellWithCard', prompt, 'Town of Cary Case', response.card);
    }).catch(function(err) {
      prompt = 'There was an error connecting to Salesforce.  Please try again later or contact Public Works at 919 469 4090';
      console.log(err);

      sendOutput(self, ':tell', prompt);
    });
  },

  'CaseConfirmationIntent': function () {
    var helperClass = new HelperClass();
    var caseIssue = this.attributes["caseIssue"];
    if(caseIssue === undefined){
      var caseSubject = this.event.request.intent.slots.caseSubject.value;
      var caseAction = this.event.request.intent.slots.caseAction.value || helperClass.addCaseAction(caseSubject);
      if(caseSubject === undefined || caseAction === undefined){
        this.emitWithState('Unhandled', true);
      } else {
        this.attributes['caseIssue'] = issues[caseSubject.toUpperCase().replace(/-/g, '') + ' ' + caseAction.toUpperCase().replace(/-/g, '')];
        caseIssue = this.attributes['caseIssue'];
        var prompt = _.template('You wish to create a new case for ${caseIssue}.  Is that correct?')({
          caseIssue: caseIssue
        });
        sendOutput(this, ':ask', prompt, prompt);
      }
    } else {
      var prompt = _.template('You wish to create a new case for ${caseIssue}.  Is that correct?')({
        caseIssue: caseIssue
      });
      sendOutput(this, ':ask', prompt, prompt);
    }
  },

  'AMAZON.YesIntent': function() {
    var prompt = AmazonHelpers.YesIntent(this.event, this.attributes,'')
    //I'm not sure if the attributes will be maintaned between Intents so reassigning it just incase.
    this.attributes["caseIssue"] = this.attributes["caseIssue"];
    this.emitWithState('CreateCaseIntent', true);
  },

  'AMAZON.NoIntent': function() {
    this.attributes["caseIssue"] = undefined;
    var prompt = 'Ok, what typt of case would you like to submit?';
    var reprompt = 'For a list of options please say help.  What do you need help with?';
    sendOutput(this, ':ask', prompt, reprompt);
  },

  'AMAZON.HelpIntent': function() {
    var val = AmazonHelpers.HelpIntent(this.event, this.attributes,'');
    var prompt = 'To create a new case you can say I need help with a problem.  For a full list of current cases please check the card in your alexa app.  What can I help you with today?';
    var reprompt = 'What can I help you with today?';
    var cardMessage = 'Current case types you can submit to the Town of Cary:\nBroken Recycling Cart\nBroken Trash Cart\nCardboard Collection\nLeaf Collection\nYard Waste Collection\nMissed Recycling\nMissed Trash\nMissed Yard Waste\nOil Collection\nUpgrade Recycling Cart\nUpgrade Trash Cart';
    this.emit(':askWithCard', prompt, prompt, 'Town of Cary Case Help', cardMessage);
  },

  'AMAZON.StopIntent': function () {
    var prompt = AmazonHelpers.StopIntent(this.event,this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function () {
    var prompt = AmazonHelpers.CancelIntent(this.event,this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function () {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
});

var trashHandlers = Alexa.CreateStateHandler(APP_STATES.TRASH, {

  'GetByAddressIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var reprompt = 'Please tell me your address so I can look up nearby public art.';
    var street_number = this.event.request.intent.slots.street_number.value;
    var street = this.event.request.intent.slots.street.value;
    var address = street_number + ' ' + street
    esriDataHelper.requestAddressInformation(address).then(function(response) {
      var uri = ESRIENDPOINT + 'PublicWorks/Public_Works_Operations/MapServer/0/query?where=&text=&objectIds=&time=&geometry=' + response.candidates[0].location.x + ',' + response.candidates[0].location.y + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson'
      return esriDataHelper.requestESRIInformation(uri);
    }).then(function(response){
      return esriDataHelper.formatMyTrashDay(response);
    }).then(function(response) {
      sendOutput(self, ':tell', response);
    }).catch(function(error){
      var prompt = 'I could not find any information for ' + address;
      sendOutput(self, ':tell', prompt);
    });
  },

  'GetTrashDayIntent': function() {
    var esriDataHelper = new EsriDataHelper();
    var self = this;
    var address = this.attributes['address'];
    var uri = ESRIENDPOINT + 'PublicWorks/Public_Works_Operations/MapServer/0/query?where=&text=&objectIds=&time=&geometry=' + address.x + ',' + address.y + '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=4326&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&resultOffset=&resultRecordCount=&f=pjson'
    esriDataHelper.requestESRIInformation(uri).then(function(response){
      return esriDataHelper.formatMyTrashDay(response);
    }).then(function(response) {
      sendOutput(self, ':tell', response);
    }).catch(function(error){
      console.log(error);
      var prompt = 'I could not find any information about your location.  Would you like to try another address?';
      var reprompt = 'Would you like to try searching at another address?';
      sendOutput(self, ':ask', prompt, reprompt);
    });
  },

  'AMAZON.YesIntent': function()
  {
    var prompt = AmazonHelpers.YesIntent(this.event, this.attributes, 'your next trash and recycle day');
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.NoIntent': function()
  {
    var prompt = AmazonHelpers.NoIntent(this.event, this.attributes);
    sendOutput(this,prompt.type,prompt.text);
  },

  'AMAZON.RepeatIntent': function ()
  {
    var prompt = AmazonHelpers.RepeatIntent(this.event.session.user.userId, this.event.request, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'AMAZON.HelpIntent': function()
  {
    var prompt = AmazonHelpers.HelpIntent(this.event, this.attributes,'next trash and recycle day');
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.StopIntent': function ()
  {
    var prompt = AmazonHelpers.StopIntent(this.event, this.attributes);
    sendOutput(this, prompt.type,prompt.text);
  },

  'AMAZON.CancelIntent': function ()
  {
    var prompt = AmazonHelpers.CancelIntent(this.event, this.attributes);
    sendOutput(this, prompt.type, prompt.text);
  },

  'Unhandled': function ()
  {
    var prompt = AmazonHelpers.unhandled(this.event.session);
    sendOutput(this, prompt.type, prompt.text);
  }
});

function getUserAddress(userToken, state, intent, self){
  console.log(self.event);
  if(self.event.context !== undefined && self.event.context.System.user.permissions !== undefined && self.event.context.System.user.permissions.consentToken !== undefined){
    var deviceId = self.event.context.System.device.deviceId;
    var consentToken = self.event.context.System.user.permissions.consentToken;
    var apiEndPoint = self.event.context.System.apiEndpoint + '/v1/devices/' + deviceId + '/settings/address';
    getAmazonAddress(apiEndPoint, consentToken).then(function(response){
      console.log(response.body);
      if(response.statusCode == 200 && response.body.addressLine1 !== undefined && response.body.addressLine1 != ''){
        var esriDataHelper = new EsriDataHelper();
        esriDataHelper.requestAddressInformation(response.body.addressLine1).then(function(response) {
          console.log('response from esri');
          console.log(response.candidates[0]);
          self.attributes["address"] = {"x": response.candidates[0].location.x, "y": response.candidates[0].location.y, "address": response.candidates[0].address};
          self.handler.state = state;
          self.emitWithState(intent, true);
        }).catch(function(err){
          console.log('Error in geocoding address');
          console.log(err);
        });
      } else {
        salesForceAddress(userToken, state, intent, self);
      }
    }).catch(function(err){
      console.log(err);
      salesForceAddress(userToken, state, intent, self);
    });
  } else {
    salesForceAddress(userToken, state, intent, self);
  }
}

function salesForceAddress(userToken, state, intent, self){
  var salesforceHelper = new SalesforceHelper();

  salesforceHelper.getUserAddress(userToken).then(function(results){
    if(results === undefined || results === null) {
      self.handler.state = state;
      var prompt = 'Please tell me your street address so I can look up your requested information';
      sendOutput(self, ':ask', prompt, prompt);
    } else {
      self.attributes["address"] = results;

      console.log(results);
      console.log(self.attributes["address"]);
      if(results.x != null && results.y != null) {
        self.handler.state = state;
        self.emitWithState(intent, true);
      }
    }
  }).catch(function(err) {
    console.log(err);
  }).finally(function(){
    if(self.attributes["address"] === undefined || self.attributes["address"] === null){
      self.handler.state = state;
      var prompt = 'Please tell me your street address so I can look up your requested information';
      sendOutput(self, ':ask', prompt, prompt);
    }
  });
}

function getAmazonAddress(apiEndpoint, userToken){
  var options = {
    //uri: INSTANCE_URL + '/services/data/v29.0/connect/communities/' + COMMUNITY_ID + '/chatter/users/me/',
    uri: apiEndpoint,
    qs: {}, //Query string data
    method: 'GET', //Specify the method
    json: true,
    timeout: 3000,
    resolveWithFullResponse: true,
    headers: { //We can define headers too
      'Authorization': 'Bearer ' + userToken
    }
  };
  return rp(options);
}

function checkCaseIssue(caseIssue){
  if(this.caseAction === undefined || this.caseSubject === undefined){
    return false;
  }
  return (caseIssue.toUpperCase() == this.caseSubject.toUpperCase() + ' ' + this.caseAction.toUpperCase()) || (caseIssue.toUpperCase() == this.caseAction.toUpperCase() + ' ' + this.caseSubject.toUpperCase());
}

function scrub(text){
  return text.replace(/&/g, ' and ');
}

function sendOutput(self, type, prompt, reprompt){
  prompt = scrub(prompt);
  self.attributes["speechOutput"] = prompt;
  if(reprompt !== undefined){
    reprompt = scrub(reprompt);
    self.attributes["repromptText"] = reprompt;
    self.emit(type, prompt, reprompt);
  } else {
    self.emit(type, prompt);
  }

}
