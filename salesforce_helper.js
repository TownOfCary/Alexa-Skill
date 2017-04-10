'use strict';
var _ = require('lodash');
var rp = require('request-promise');
var jsforce = require('jsforce');
var EsriDataHelper = require('./esri_data_helper');
var HelperClass = require('./helper_functions.js');
var ESRIENDPOINT = 'https://maps.townofcary.org/arcgis1/rest/services/';
require('datejs');

// the salesforce community Id (only needed when Account linking is required)
// to get the ID go to Salesforce org -> Setup -> search for 'community' in the Quick Find section and click on the Communities->All Communities and hover over
// your org community. In the URL shown after hovering you will see a parameter 'networkId' starting with 0DB. Coppy that one in the below variable.
var COMMUNITY_ID = '0DB7A0000008OStWAM';

//salesforce community login URL
var INSTANCE_URL = 'https://311test-onecary.cs44.force.com/OneCary';

function SalesforceHelper() { }

SalesforceHelper.prototype.createCaseInSalesforce = function(userToken, caseIssue) {
	var obj = {Subject: 'Alexa Case'};
	obj.Origin = 'Alexa';
	var conn = new jsforce.Connection({
		instanceUrl : INSTANCE_URL,
		accessToken : userToken,
		version:'39.0'
	});
  return getUserId(userToken).then(function(results){
    return conn.query("Select ContactId from User where Id = '" + results.body.id + "'");
	}).then(function(results){
      var userRecord = results.records[0];
      obj.ContactId = userRecord.ContactId;
      return conn.query("Select Id from Case_Issue__c where Name LIKE '%" + caseIssue + "%'");
	}).then(function(results) {
		var caseIssueRecord = results.records[0];
		obj.CaseIssue__c = caseIssueRecord.Id;
		return conn.query("Select Id from RecordType where Name = 'public works case'");
	}).then(function(results) {
    var recordType = results.records[0];
    obj.RecordTypeId = recordType.Id;
    return conn.sobject("Case").create(obj);
	}).then(function(results){
    return conn.query("Select Id, CaseNumber, Status, Expected_Completion_Date__c, LastModifiedDate, CaseIssue__r.Name from Case where Id = '" + results.id + "'");
	}).then(function(results) {
    return results.records[0];
  }).catch(function(err) {
    console.log('Error in case creation');
    console.log(err);
  });
};

SalesforceHelper.prototype.findLatestCaseStatus = function(userToken, caseIssue) {
	var conn = new jsforce.Connection({
		instanceUrl : INSTANCE_URL,
		accessToken : userToken,
		version:'39.0'
	});
	return getUserId(userToken).then(function(results){
		return conn.query("Select ContactId from User where Id = '" + results.body.id + "'")
	}).then(function(results){
		var q = '';
		var userContactId = results.records[0].ContactId;
		if(caseIssue == undefined){
			q = "ContactId = '" + userContactId + "'";
		} else {
			q = "ContactId = '" + userContactId + "' AND CaseIssue__r.Name LIKE '%" + caseIssue + "%'";
		}
		console.log(q);
		return conn.query("Select Status, CaseNumber, Expected_Completion_Date__c, CreatedDate, ClosedDate, LastModifiedDate, CaseIssue__r.Name from Case where " +  q + " order by createdDate DESC Limit 1");
	}).then(function(results){
			return results.records;
	}).catch(function(err) {
    console.log('Error in case lookup');
    console.log(err);
  });
};

SalesforceHelper.prototype.findCaseStatus = function(userToken, caseNumber) {
	var conn = new jsforce.Connection({
		instanceUrl : INSTANCE_URL,
		accessToken : userToken,
		version:'39.0'
	});
	return conn.query("Select Status, CaseNumber, ClosedDate, CreatedDate, Expected_Completion_Date__c, LastModifiedDate, CaseIssue__r.Name from Case where CaseNumber = '" + caseNumber + "' order by createdDate DESC Limit 1").then(function(results){
			return results.records;
	}).catch(function(err) {
    console.log('Error in case lookup');
    console.log(err);
  });
};

SalesforceHelper.prototype.formatExistingCase = function(caseInfo) {
	var response = {};
	var helperClass = new HelperClass();
	if (caseInfo.length > 0) {
		var prompt = _.template('Your case was last modified on ${lastModifiedDate}.'); // The status of your case is ${caseStatus}, and it
		var lmDate = Date.parse(caseInfo[0].LastModifiedDate).toString();
	  response.prompt = prompt({
			caseStatus: caseInfo[0].Status,
			lastModifiedDate: helperClass.formatDateTime(Date.parse(caseInfo[0].LastModifiedDate)) //helperClass.formatDateTime(lmDate.slice(0, lmDate.indexOf('GMT')))
		});
		var card = _.template('Your case for ${caseIssue} has a case number of ${caseNumber}'); //  an expected completion date of ${finishDate}
		response.card = card({
			caseIssue: caseInfo[0].CaseIssue__r.Name,
			caseNumber: caseInfo[0].CaseNumber,
			finishDate: helperClass.formatDateTime(Date.parse(caseInfo[0].Expected_Completion_Date__c))
		});
	} else {
		response.prompt = 'I\'m sorry, but I could not find any previous cases on your account';
		response.card = 'I\'m sorry, but I could not find any previous cases on your account';
	}
	return response;
};

SalesforceHelper.prototype.formatNewCaseStatus = function(caseInfo) {
	var response = {};
	var helperClass = new HelperClass();
  var prompt = _.template('I\'ve created a new case for ${caseIssue}.  The case number is ${caseNumber}. You can view the case on your Alexa App.');
	response.prompt = prompt({
		caseIssue: caseInfo.CaseIssue__r.Name,
		caseNumber: caseInfo.CaseNumber
	});
	var card = _.template('Your new case for ${caseIssue} has a case number of ${caseNumber}'); // an expected completion date of ${finishDate}
	response.card = card({
		caseIssue: caseInfo.CaseIssue__r.Name,
		caseNumber: caseInfo.CaseNumber,
		finishDate: helperClass.formatDateTime(caseInfo.Expected_Completion_Date__c)
	});
	return response;
};

SalesforceHelper.prototype.getUserAddress = function(userToken) {
	var conn = new jsforce.Connection({
		instanceUrl : INSTANCE_URL,
		accessToken : userToken
	});
	return getUserId(userToken).then(function(results){
		return conn.query("Select ContactId from User where Id = '" + results.body.id + "'");
	}).then(function(results){
		return conn.query("Select MailingStreet, MailingLatitude, MailingLongitude From Contact Where Id = '" + results.records[0].ContactId +"'" );
	}).then(function(results){
		if(results.records[0].MailingLatitude == null || results.records[0].MailingLongitude == null){
			var esriDataHelper = new EsriDataHelper();
			return esriDataHelper.requestAddressInformation(results.records[0].MailingStreet).then(function(response) {
				return {"x": response.candidates[0].location.x, "y": response.candidates[0].location.y};
			}).catch(function(err){
				console.log('Error in geocoding address');
		    console.log(err);
			});
		} else{
				return {"x": results.records[0].MailingLongitude, "y": results.records[0].MailingLatitude};
		}
	}).catch(function(err){
		console.log('Error in retrieving address');
    console.log(err);
	});
};

SalesforceHelper.prototype.getTownHallHours = function(userToken, date) {
	var conn = new jsforce.Connection({
		instanceUrl : INSTANCE_URL,
		accessToken : userToken,
		version: '39.0'
	});

	return conn.query('Select ActivityDate from Holiday').then(function(response) {
		if(!Date.parse(date).is().weekday()){
			return {closed: true};
		} else {
			for(var i = 0; i < response.records.length; i++){
				if(response.records[i].ActivityDate == date){
					return {closed: true};
				}
			}
			return {closed: false, start: "8 am", close: "5 pm"};
		}
	}).catch(function(err){
		console.log('error here somehow');
		console.log(err);
	});
};

SalesforceHelper.prototype.formatTownHallHours = function(timeInfo, date) {
	var prompt = '';
	var helperClass = new HelperClass();
	console.log(Date.parse(date));
	if(timeInfo.closed){
		prompt = _.template('The Town Hall is closed on ${closedDate}')({
			closedDate: helperClass.formatDate(Date.parse(date))
		});
	} else {
		prompt = _.template('The Town Hall is open from ${startTime} until ${endTime} on ${date}')({
			startTime: timeInfo.start,
			endTime: timeInfo.close,
			date: helperClass.formatDate(Date.parse(date))
		});
	}
	return prompt;
};

function getUserId(userToken){
  var options = {
    uri: INSTANCE_URL + '/services/data/v29.0/connect/communities/' + COMMUNITY_ID + '/chatter/users/me/',
    qs: {}, //Query string data
    method: 'GET', //Specify the method
    resolveWithFullResponse: true,
    json: true,
    timeout: 3000,
    headers: { //We can define headers too
      'Authorization': 'Bearer ' + userToken
    }
  };
  return rp(options);
}

module.exports = SalesforceHelper;
