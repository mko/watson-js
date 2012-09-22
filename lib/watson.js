/*
 * Copyright (c) 2012 Michael Owens. Licensed via The MIT License.
 *
 * Simple API Wrapper for the AT&T Speech API
 */

// !Dependencies
var fs = require('fs'),
	request = require('request');

// !Set up the client options and defaults
var Watson = exports.Watson = function(options) {
    this.client_id = options.client_id || null ;
    this.client_secret = options.client_secret || null;
    this.access_token = options.access_token || null;
    this.scope = options.scope || "SPEECH";
    this.context = options.context || "Generic";
    this.xarg = options.xarg || "";
    this.access_token_url = options.access_token_url || "https://api.att.com/oauth/token"
    this.api_domain = options.api_domain || "api.att.com";
};

// Get Access Token Method
Watson.prototype.getAccessToken = function(callback) {
	// Set the params for the OAuth 2.0 Request
    var request_params = {
		client_id: this.client_id,
		client_secret: this.client_secret,
		grant_type: "client_credentials",
		scope: this.scope
    };
    
    // Create the Param String
    var paramlist  = [];
    for (pk in request_params) {
		paramlist.push(pk + "=" + request_params[pk]);
    };
    var body_string = paramlist.join("&");
    
    // !Details of the OAuth 2.0 Request
    var request_details = {  
		method: "POST",
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		uri: this.access_token_url,
		body: body_string
    };
    
    // !Make the request
    request(request_details, function(error, response, body) {
    	if(error) {
			error = new Error('Failed to get access token.');
    	}
    	// Pass any errors and the Access Token back to the app
    	callback(error, JSON.parse(body)['access_token']);
	});
};

// !SpeechToText API Call Wrapper
Watson.prototype.speechToText = function(speechFile, accessToken, callback) {
	// !Details of the API Call Request
	var request_details = {
		method: 'POST',
		headers: {
			'Accept': 'application/json',
			'Authorization': 'Bearer ' + accessToken,	// Access Token must be retrieved before making API Calls
			'Content-Type': 'audio/wav',				// TODO: Add dynamic support for audio/amr
			'X-SpeechContext': this.context,			// Possible Values: Generic, UVerseEPG, BusinessSearch, Websearch, SMS, Voicemail, QuestionAndAnswer
			'X-Arg': this.xarg							// Occasionally used for custom grammar sets. Unnecessary by default.
		},
		uri: "https://" + this.api_domain + "/rest/1/SpeechToText"
	};
	// !Pipe the Speech file from the Node.js server to the AT&T API server
	fs.createReadStream(speechFile).pipe(request(
				request_details,
				function(error, response, body) {
					// Try to read the `body` as JSON
					try {
						var parsed = JSON.parse(body);
					} catch(e) {
					// If it fails, it's an invalid API Reply
						error = new Error('API Reply is not a valid JSON string.');
						error.reply = body;
					} finally {
					// Toss the error and/or parsed response back to the app
						callback(error, parsed);
					}
				}
		)
	);
};