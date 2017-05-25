'use strict';

var bodyParser = require('body-parser'),
	express = require('express'),
	lti = require('ims-lti');

// MemoryStore probably shouldn't be used in production
var nonceStore = new lti.Stores.MemoryStore();

var secrets = Object.create(null);
secrets.key = 'secret';
secrets["secret"] = "This is my secret"; //TODO I don't understand how this is supposed to work, this line is a hack to clear the error

function getSecret (consumerKey, cb) {
	var secret = secrets[consumerKey];
	if (secret) {
		cb(null, secret);
		return;
	}

	var err = new Error('Unknown consumer "' + consumerKey + '"');
	err.status = 403;

	cb(err);
}

function handleLaunch (req, res, next) {
	console.log("We got a request!");
	if (!req.body) {
		var err = new Error('Expected a body');
		err.status = 400;

		return next(err);
	}

	console.log("Da body is: ");
	console.dir(req.body);

	var consumerKey = req.body.oauth_consumer_key;
	if (!consumerKey) {
		var err = new Error('Expected a consumer');
		err.status = 422;

		return next(err);
	}

	getSecret(consumerKey, function (err, consumerSecret) {
		if (err) {
			return next(err);
		}

		console.log("Creating provider with consumerKey = " + consumerKey + " consumerSecret = " + consumerSecret +"\r\n");
		var provider = new lti.Provider(consumerKey, consumerSecret, nonceStore);

		provider.valid_request(req, function (err, isValid) {
			//TODO for what I am doing now I am not worried about the signature, but eventually I will be
		//	if ( err || !isValid) {
		//		return next(err || new Error('invalid lti'));
		//	}

			var body = {};
			[
				'roles', 'admin', 'alumni', 'content_developer', 'guest', 'instructor',
				'manager', 'member', 'mentor', 'none', 'observer', 'other', 'prospective_student',
				'student', 'ta', 'launch_request', 'username', 'userId', 'mentor_user_ids',
				'context_id', 'context_label', 'context_title', 'body'
			].forEach(function (key) {
				body[key] = provider[key];
			});

			
			res
				.status(200)
				.json(body);
		});
	});
}

var app = express();

app.set('json spaces', 2);

//app.get('/launch-lti',function (req, res) {
//    res.writeHead(200, { 'Content-Type': 'text/plain' });
//    res.end('This requires an LTI request\n');

// If using reverse proxy to terminate SSL
// Such as an Elastic-Load-Balence, ElasticBeanstalk, Heroku
// Uncomment the following line
// app.enable('trust proxy');

app.post('/launch-lti', bodyParser.urlencoded({ extended: false }), handleLaunch);

var server = require('http')
	.createServer(app)
	.listen(process.env.port, function () {
		console.log("process.env.port: " + process.env.port + "\r\n");
		var address = server.address();
		console.log('Listening on %s:%s', address.address, address.port);
	});
