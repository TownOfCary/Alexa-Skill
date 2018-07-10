'use strict';
class AmazonHelpers
{
  var ua = require('universal-analytics');

  static RepeatIntent(google_id, user_id, event1, attr)
  {
    var intentTrackingID = ua(google_id, user_id, {strictCidFormat: false, https: true});
    intentTrackingID.event('AMAZON.RepeatIntent',"Success","Request: " + JSON.stringify(event1) + " Attributes: " + JSON.stringify(attr)).send();
    var speech = attr["speechOutput"];
    if (speech === undefined || speech === "")
    {
        return {type :':tell', text: 'I\'m sorry, I didn\'t catch that'};
    }
    else
    {
      return {type: ':ask', text: attr['speechOutput']};
    }
  };

  static unhandled(google_id, session)
  {
      var intentTrackingID = ua(google_id, session.user.userId, {strictCidFormat: false, https: true});
      intentTrackingID.event("Unhandled","Success", session).send();
      return {type: ':ask', text: 'I\'m sorry.  I didn\'t catch that.  Can you please repeat that.' };
  };

  static YesIntent(google_id, _event, attr, prompt)
  {
    var intentTrackingID = ua(google_id, _event.session.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event("AMAZON.YesIntent","Success","Request: " + JSON.stringify(_event.request) + " Attributes: " + JSON.stringify(attr)).send();
    return {type: ':ask', text : 'Please tell me an address so I can look up ' + prompt}
  };
  static CancelIntent (google_id, _event, attr)
  {
    var intentTrackingID = ua(google_id, _event.sesion.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event('AMAZON.CancelIntent',"Success","Request: " + JSON.stringify(_event.request) + " Attributes: " + JSON.stringify(attr)).send();
    return {type: ':tell', text: 'Goodbye'};
  };
  static HelpIntent(google_id, _event, attr, prompt)
  {
    var intentTrackingID = ua(google_id, _event.session.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event('AMAZON.HelpIntent',"Success","Request: " + JSON.stringify(_event.request) + " Attributes: " + JSON.stringify(attr)).send();
    var val = 'Please tell me your house number and street for me to look up ' + prompt;
    return {type: ':ask', text : val};
  };
  static NoIntent(google_id,_event, attr)
  {
    var intentTrackingID = ua(google_id, _event.session.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event("AMAZON.NoIntent","Success","Request: " + JSON.stringify(_event.request) + " Attributes: " + JSON.stringify(attr)).send();
    return {type: ':tell', text: 'OK, Have a nice day'};
  };
  static StopIntent(google_id,_event,attr)
  {
    var intentTrackingID = ua(google_id, _event.session.user.userId, {strictCidFormat: false, https: true});
    intentTrackingID.event('AMAZON.StopIntent',"Success","Request: " + JSON.stringify(_event.request) + " Attributes: " + JSON.stringify(attr)).send();
    return {type: ':tell', text: 'Goodbye'};
  };
}

module.exports = AmazonHelpers;
