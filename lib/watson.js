/*
 * Copyright (c) 2012 Michael Owens. Licensed via The MIT License.
 *
 * Simple API Wrapper for the AT&T Speech API
 */

// !Dependencies
var fs = require('fs'),
	request = require('request'),
	merge = require('merge-descriptors'),
	path = require('path'),
	readStreamBuffer = require('stream-buffers').ReadableStreamBuffer;

// !Set up the client options and defaults
var Watson = exports.Watson = function(options) {
	this.client_id = options.client_id || null ;
	this.client_secret = options.client_secret || null;
	this.access_token = options.access_token || null;
	this.scope = options.scope || 'SPEECH';
	this.access_token_url = options.access_token_url || 'https://api.att.com/oauth/token'
	this.api_domain = options.api_domain || 'api.att.com';
};

// Get Access Token Method
Watson.prototype.getAccessToken = function(callback) {
	// Set the params for the OAuth 2.0 Request
	var request_params = {
		client_id: this.client_id,
		client_secret: this.client_secret,
		grant_type: 'client_credentials',
		scope: this.scope
	};
	
	// Create the Param String
	var paramlist  = [];
	for (pk in request_params) {
		paramlist.push(pk + '=' + request_params[pk]);
	};
	var body_string = paramlist.join('&');
	
	// !Details of the OAuth 2.0 Request
	var request_details = {  
		method: 'POST',
		headers: {'content-type' : 'application/x-www-form-urlencoded'},
		uri: this.access_token_url,
		body: body_string
	};
	
	// !Make the request
	request(request_details, function(error, response, body) {
		if(error) {
			error = new Error('Failed to get access token.');
		}

		this.access_token = JSON.parse(body)['access_token'];

		// Pass any errors and the Access Token back to the app
		callback(error, this.access_token );
	});
};

// !SpeechToText API Call Wrapper
Watson.prototype.speechToText = function(speechFile, reqParams, callback) {

	var reqHeaders = {
		'Accept': 'application/json',
		'Authorization': 'Bearer ' + this.access_token,
		'Content-Type': 'audio/wav',
		'X-SpeechContext': 'Generic'			// Possible Values: Generic, UVerseEPG, BusinessSearch, Websearch, SMS, Voicemail, QuestionAndAnswer
	};

	// get a call back
	callback = arguments[ arguments.length - 1 ];

	// make sure we have an access_token
	if( this.access_token === null )
		throw new Error( 'Call the getAccessToken function or pass in "access_token" in the constructor options before calling speechToText' );

	// ensure that we have a callback. This function is sort of pointless without a callback
	if( typeof callback != 'function' )
		throw new Error( 'The last argument you pass in must be a callback function' );

	// add the params to the request headers
	// possible parameter values can be seen here under request parameters: http://developer.att.com/apis/speech/docs/v3
	merge( reqHeaders, reqParams );

	// !Details of the API Call Request
	var request_details = {
		method: 'POST',
		headers: reqHeaders,
		uri: 'https://' + this.api_domain + '/speech/v3/speechToText'
	};

	var stream = null,
		dataIsBuffer = Buffer.isBuffer( speechFile );

	if( dataIsBuffer ) {

		stream = new readStreamBuffer({
			frequency: 1,  // in milliseconds.
			chunkSize: 2048 // in bytes.
		});
	} else {

		stream = fs.createReadStream(speechFile);
	}

	// !Pipe the Speech file from the Node.js server to the AT&T API server
	stream.pipe(request(
				request_details,
				function(error, response, body) {
					// Try to read the `body` as JSON
					try {
						var parsed = JSON.parse(body);

						console.log( 'START END', Date.now() );
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

	if( dataIsBuffer ) {

		stream.put( speechFile );

		console.log( 'START SEND', Date.now() );
	}
};

Watson.prototype.speechToTextCustom = function(speechFile, grammarFile, reqParams, callback) {

	var reqHeaders = {
		'Accept': 'application/json',
		'Authorization': 'Bearer ' + this.access_token,
		'Content-Type': 'multipart/x-srgs-audio',
		'X-SpeechContext': 'GrammarList'			// Possible Values: GenericHints, GrammarList
	};

	// get a call back
	callback = arguments[ arguments.length - 1 ];

	// make sure we have an access_token
	if( this.access_token === null )
		throw new Error( 'Call the getAccessToken function or pass in "access_token" in the constructor options before calling speechToText' );

	// ensure that we have a callback. This function is sort of pointless without a callback
	if( typeof callback != 'function' )
		throw new Error( 'The last argument you pass in must be a callback function' );

	// add the params to the request headers
	// possible parameter values can be seen here under request parameters: http://developer.att.com/apis/speech/docs/v3
	merge( reqHeaders, reqParams );

	// !Details of the API Call Request
	var request_details = {
		method: 'POST',
		headers: reqHeaders,
		uri: 'https://' + this.api_domain + '/speech/v3/speechToTextCustom',
		multipart: [
			{
				'content-disposition': 'form-data;name="x-grammar";filename="example.srgs"',
				'content-type': 'application/srgs+xml',
				body: fs.readFileSync( grammarFile, { encoding: 'utf8' } )
			},
			{ 
				'content-disposition': 'form-data; name="x-voice"; filename="' + path.basename( speechFile ) + '"',
				'content-type': 'audio/wav',
				body: fs.readFileSync( speechFile )
			}
		]
	};

	// !Pipe the Speech file from the Node.js server to the AT&T API server
	request(
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
	);
};

function getStreamFromFile() {


}
