var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var twilio = require('twilio');
var config = require("../config");

var client = twilio(config.accountSid, config.authToken);

// Configure application routes
module.exports = function(app) {
    // Set Jade as the default template engine
    app.set('view engine', 'jade');

    // Express static file middleware - serves up JS, CSS, and images from the
    // "public" directory where we started our webapp process
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Parse incoming request bodies as form-encoded
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Use morgan for HTTP request logging
    app.use(morgan('dev'));

    // Home Page with Click to Call 
    app.get('/', function(request, response) {
        response.render('index');
    });

    app.get('/app', function(req, res) {
    	res.render('home');
    });

     app.get('/login', function(req, res) {
    	res.render('login');
    });

     app.get('/mail', function(req, res) {
        res.render('inbox');
     });

    // Handle an AJAX POST request to place an outbound call
    app.post('/call', function(request, response) {
        // This should be the publicly accessible URL for your application
        // Here, we just use the host for the application making the request,
        // but you can hard code it or use something different if need be
        var url = 'http://' + 'syscall.herokuapp.com' + '/outbound';
        
        // Place an outbound call to the user, using the TwiML instructions
        // from the /outbound route
        client.makeCall({
            to: request.body.phoneNumber,
            from: config.twilioNumber,
            url: url
        }, function(err, message) {
            console.log(err);
            if (err) {
                response.status(500).send(err);
            } else {
                response.send({
                    message: 'Thank you! We will be calling you shortly.'
                });
            }
        });
    });

    app.get('/julian', function(req, res) {

    // Create an object which will generate a capability token
    // Replace these two arguments with your own account SID
    // and auth token:
    var capability = new twilio.Capability(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );

    // Give the capability generator permission to accept incoming
    // calls to the ID "kevin"
    capability.allowClientIncoming('julian');

    // Render an HTML page which contains our capability token
    res.render('index.ejs', {
        token:capability.generate()
    });
});

    // Return TwiML instuctions for the outbound call
    app.post('/outbound', function(request, response) {
        // We could use twilio.TwimlResponse, but Jade works too - here's how
        // we would render a TwiML (XML) response using Jade
        response.type('text/xml');
        response.render('outbound');
    });
};
