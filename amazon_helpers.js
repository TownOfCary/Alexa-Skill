'use strict';

class AmazonHelpers{

  static RepeatIntent(user_id, event1, attr) {
    var speech = attr["speechOutput"];
    if (speech === undefined || speech === "")
    {
        return {type :':tell', text: 'I\'m sorry, I didn\'t catch that'};
    }
    else
    {
      return {type: ':ask', text: attr['speechOutput']};
    }
  }

  static unhandled(session) {
      return {type: ':ask', text: 'I\'m sorry.  I didn\'t catch that.  Can you please repeat that.' };
  }

  static YesIntent(_event, attr, prompt) {
    return {type: ':ask', text : 'Please tell me an address so I can look up ' + prompt}
  }

  static CancelIntent(_event, attr) {
    return {type: ':tell', text: 'Goodbye'};
  }

  static HelpIntent(_event, attr, prompt) {
    var val = 'Please tell me your house number and street for me to look up ' + prompt;
    return {type: ':ask', text : val};
  }

  static NoIntent(_event, attr) {
    return {type: ':tell', text: 'OK, Have a nice day'};
  }

  static StopIntent(_event, attr) {
    return {type: ':tell', text: 'Goodbye'};
  }
}

module.exports = AmazonHelpers;
