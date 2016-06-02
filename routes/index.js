var path = require('path');
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var twilio = require('twilio');
var session = require('client-sessions');
var bcrypt = require('bcryptjs');
var config = require("../config");
var twilioClient = twilio(config.accountSid, config.authToken);
var storage = require('node-persist');
// Dependencies

storage.initSync();

// Postgresql
var pg = require('pg');
pg.defaults.ssl = true;
var connectionString = 'postgres://aczsxkfpgxdzhk:76QAcAJ0VVU2mbT35WYovAX1MT@ec2-54-83-5-43.compute-1.amazonaws.com:5432/d9v4u0oml89ej8';
var client = new pg.Client(connectionString);

// ================== TO DO LIST =======================
//
// 1. Each agent has to have their own phone number (For now I'll deal with that until I figure out 1 number solution)
// 2. Set conditions, if the user has certain values in their database account, call different capabilities in the route when
//      they refresh the page!
// 3. Set up internal call forwarding for one phone number, this allows multiple agents!
// 4. For inbound call forwarding -TEST THIS- someone calls in, the view dials one of our random phone numbers and connects
//      with on of our agents. I don't know if I have to conference this.
// 5. Call Twilio to see whats up with the 2 sec difference on incoming calls
// 6. FIXED PARAMETERS, IT WAS THE CAPITAL OF 'FROM'
//
// ================= END TO DO LIST ====================

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

    app.use(cookieParser());

    app.use(session({
      cookieName: 'session',
      secret: 'jewf08j283fewioujf082j3kfewj0fi2',
      duration: 30 * 60 * 1000,
      activeDuration: 5 * 60 * 1000,
      cookie: {
        httpOnly: false
      }
    }));

    // Use morgan for HTTP request logging
    app.use(morgan('dev'));

    // Home Page with Click to Call 
    app.get('/', function(request, response) {
        response.render('landing.ejs');
    });

    app.get('/sdfsdf', function(req, res) {
    	res.render('home');
    });

     app.get('/login', function(req, res) {
    	res.render('login');
    });

     app.get('/mail', function(req, res) {
        res.render('inbox');
     });

    // Require someone to be logged in
    function requireLogin(req, res, next) {
      if (!req.session.agent) {
        res.render('applogin.ejs');
      } else {
        next();
      }
    }

    function requireAdmin(req, res, next) {
        if (req.session.agent.role !== 2) {
            res.send('NOT OK');
        }
    }

    app.get('/app', requireLogin, function(req, res) {

        // SET SESSION TO SHORTER VARIABLE
        var agent = req.session.agent;

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
        capability.allowClientOutgoing('APf798ecaf8671d85a146a7452a0dfe8f0');

        res.locals.agent = req.session.agent;
        // Render an HTML page which contains our capability token
        res.render('index.ejs', {
            token:capability.generate()
        });
    });

    // This is the endpoint your Twilio number's Voice Request URL should point at
    app.post('/inbound', function(req, res, next) {

      // conference name is CallSid to simplfy the front and back end connection
      var conferenceName = Math.floor(Math.random() * 10000).toString();

      var callInfo = {
        conferenceName: conferenceName,
        from: req.body.Caller,
        city: req.body.CallerCity,
        state: req.body.CallerState,
        zipCode: req.body.CallerZip
      }
      storage.setItem('gutermanj@gmail.com', callInfo);
      // Will replace 'gutermanj@gmail.com' with randomly chosen agent to accept the call


      // console.log("INBOUND CONFERENCE NAME: " + callInfo);
      // Here we will set the storage data with the conferenceName and the randomly selected agent to accept
      //    the inbound call!

      // FIGURED OUT WHY SESSIONS AREN'T WORKING, THE SESSION ISN"T BEING SAVED ON THE USERS END BECAUSE
      // INBOUND IS BEING HIT BY TWILIO, NOT BY MY USER!!!

      // NEW PROCESS -----------------------------------------------------------------------------------------------------
      // *****************************************************************************************************************
      // node-persist -- using this for temp persistence of conference room name
      // By default, storage data will automatically written in persistence in addition to memory!
      
      // User Object in mongoDB will hold their name, email (important), agent phoneNumber, and currentConference (important)

      // storage.setItem(agent.email, agent.currentConference)
      // Query database for all users, randomly pick one take inbound call, set to: agent.phonenumber....

      // LATER when we need that conference name, we can do this :
      // var conferenceName = storage.getItem(req.session.agent.email).conferenceName
      // BOOM that's it!

      // ========================================== THIS WORKS ==========================================

      // Create a call to your mobile and add the conference name as a parameter to
      // the URL.
      // ******************************************************************************************************************
      // END NEW PROCESS --------------------------------------------------------------------------------------------------

      twilioClient.calls.create({
        url: "http://sudocall.herokuapp.com/join_conference?conferenceId=" + conferenceName,
        from: config.inboundPhonenumber,
        to: config.twilioNumber,
        method: "POST"
      });

      // Now return TwiML to the caller to put them in the conference, using the
      // same name.
      var twiml = new twilio.TwimlResponse();
      twiml.dial(function(node) {
        node.conference(conferenceName, {
          startConferenceOnEnter: true
        });
      });
      res.set('Content-Type', 'text/xml');
      res.send(twiml.toString());
    });

    // This is the endpoint that Twilio will call when you answer the phone
    app.post("/join_conference", function(req, res, next) {
      var conferenceName = req.query.conferenceId;
      // Dont change this

      // We return TwiML to enter the same conference
      var twiml = new twilio.TwimlResponse();
      twiml.dial(function(node) {
        node.conference(conferenceName, {
          startConferenceOnEnter: true
        });
      });
      res.set('Content-Type', 'text/xml');
      res.send(twiml.toString());
    });

    app.post("/transfer_to_agent", function(req, res, next) {
        var conferenceName = storage.getItem(req.session.agent.email);
        // This will be changed to a getItem() from storage data

        twilioClient.calls.create({
            // to: "+12395713488",
            from: config.inboundPhonenumber,
            url: "http://sudocall.herokuapp.com/join_conference?conferenceId=" + conferenceName
        });

        var twiml = new twilio.TwimlResponse();
        twiml.dial(function(node) {
            node.conference(conferenceName, {
                startConferenceOnEnter: true
            });
        }); 
        res.set('Content-Type', 'text/xml');
        res.send(twiml.toString());
    });


    // Sends Current Call Info Back To Frontend for agent to use
    app.get('/currentCall', function(req, res, next) {
      var callInfo = storage.getItem(req.session.agent.email);
      res.json(callInfo);
    });



    // ============ START USER AUTH =================

    app.post('/login', function(req, res) {
    var results = [];
    // Get a Postgres client from the connection pool
    pg.connect(connectionString, function(err, client, done) {
        // Handle connection errors
        if(err) {
          done();
          console.log(err);
          return res.status(500).json({ success: false, data: err});
        }
        // SQL Query > Grab user input
        var emailInput = req.body.email;
        var passwordInput = req.body.password;
        // See if the email exists
        var query = client.query('SELECT * FROM agents WHERE email =' + '\'' + emailInput + '\'');
        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row);
        });
        // After all data is returned, close connection and return results
        query.on('end', function() {
            done(); // If the email doesn't exist - get out of here
            if (results === null) {
              res.render('applogin.ejs');
            } else { // If it does exist
                if (results[0] !== undefined) {
                  var agent = results[0];
                  // Check bcrypted password to see if they match
                  if (bcrypt.compareSync(req.body.password, agent.password)) {
                    req.session.agent = agent; // Set the session
                    res.locals.agent = agent;
                    res.redirect('/app');
                  } else {
                    // If they don't match
                    res.redirect('/app');
                  }
                  } else {
                  res.redirect('/app');
                } // For some reason I have to check if it's undefined as well as 
                  // null or SQL will yell at us
          }
        }); // query on end
      }); //pg connect
    });
    app.get('/signup', function(req, res) {
        res.render('appsignup.ejs');
    });
    app.post('/signup', requireAdmin, function(req, res, next) {
       // Turning that password into something funky
        var hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(10));
        var results = [];
        // Grab data from http request
        var data = {
          first_name: req.body.first_name,
          last_name: req.body.last_name,
          email: req.body.email,
          password: hash,
          role: 0,
          inbound: true,
          outbound: true
        };
        // ROLES -----------------
        // 0 = Phone Rep
        // 1 = Manager
        // 2 = Software Developer
        // DataType is Integer!!
        // Get a Postgres client from the connection pool
        pg.connect(connectionString, function(err, client, done) {
            // Handle connection errors
            if(err) {
              done();
              console.log(err);
              return res.status(500).json({ success: false, data: err});
            }
            // SQL Query > Create new row for an account
            client.query("INSERT INTO agents(first_name, last_name, email, password, role, inbound, outbound) values($1, $2, $3, $4, $5, $6, $7)", [data.first_name, data.last_name, data.email, data.password, data.role, data.inbound, data.outbound]);
            // SQL Query > Last account created
            var query = client.query("SELECT * FROM agents");
            // Stream results back one row at a time
            query.on('row', function(row) {
                results.push(row);
            });
            // After all data is returned, close connection and return results
            query.on('end', function() {
                done();
                res.redirect('/app');
            });
        }); // pg connect
    });
    app.get('/logout', function(req, res) {
        if (req.session.agent) {
            req.session.destroy();
            res.redirect('/app');
        }
    });
    // -- END AGENT AUTHENTICATION


    // // Handle an AJAX POST request to place an outbound call
    // app.post('/call', function(request, response) {
    //     // This should be the publicly accessible URL for your application
    //     // Here, we just use the host for the application making the request,
    //     // but you can hard code it or use something different if need be
    //     var url = 'http://' + 'syscall.herokuapp.com' + '/outbound';
        
    //     // Place an outbound call to the user, using the TwiML instructions
    //     // from the /outbound route
    //     client.makeCall({
    //         to: request.body.phoneNumber,
    //         from: config.twilioNumber,
    //         url: url
    //     }, function(err, message) {
    //         console.log(err);
    //         if (err) {
    //             response.status(500).send(err);
    //         } else {
    //             response.send({
    //                 message: 'Thank you! We will be calling you shortly.'
    //             });
    //         }
    //     });
    // });

    // // Return TwiML instuctions for the outbound call
    // app.post('/outbound', function(request, response) {
    //     // We could use twilio.TwimlResponse, but Jade works too - here's how
    //     // we would render a TwiML (XML) response using Jade
    //     response.type('text/xml');
    //     response.render('outbound');
    // });
};
