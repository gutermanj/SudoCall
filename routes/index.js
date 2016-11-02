var path = require('path');
var express = require('express');
var app = require('express')();

var http = require('http').Server(app);
var io = require('socket.io')(http);

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








/*
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

Things we can do with angular:

    Make on-click events happen like sending data when ready to transfer a call...

    We can't look people up without client-action.

    When someone calls in, jquery will continue searching for data and replacing it on the DOM

    when we're ready to transfer angular will handle the rest of the front-end

    SO RIGHT NOW:
        When a call comes in, we transfer the call to an agent and they get put on hold.

        I need to write the code to bring them back into the call, but they can't hear

        the convo with the agent right now.

        GREAT PROGRESS!

        DONEDONEDONEDONE

        --------------------------

        ACTIVE!!!

        END CALL or else a voicemail will continue on.

        We have to update the call with 'completed' or something

        ---

        Need to figure out why it's calling again after disconnecting the call

        --

        Work on front-end, handing disconnecting calls etc...

        ACTIVE!!!

*/

// Configure application routes

// module.exports = function(app) {



    pg.connect(connectionString, function(err, client, done) {
      if (err) {
        return console.error('error fetching client from pool', err);
      } else {
        console.log("Successfully Connected to Postgresql - Ready For Connections");
      }

      // client.query('SELECT * FROM agents WHERE email = $1', ['gutermanj@gmail.com'], function(err, result) {
      //   //call `done()` to release the client back to the pool
      //   done();

      //   if(err) {
      //     return console.error('error running query', err);
      //   }
      //   console.log(result.rows[0]);
      //   console.log("Success One!");
      //   //output: 1
      // });
      // EXAMPLE USING POOL -------------------------------------------------------------------------------------

    // Set Jade as the default template engine
    app.set('view engine', 'jade');

    // THIS NEEDS TO BE CHANGED TO STATIC PATH?!
    app.set('views', 'views');

    // Express static file middleware - serves up JS, CSS, and images from the
    // "public" directory where we started our webapp process
    app.use(express.static(path.join(process.cwd(), '/public')));

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

    var availableAgents = [];

    // Home Page with Click to Call

    app.get('/', function(request, response) {
        response.render('landing.ejs');
    });

    app.get('/sdfsdf', function(req, res) {
    	res.render('home');
    });

     app.get('/login', function(req, res) {
    	res.render('applogin.ejs');
    });

     // app.get('/mail', function(req, res) {
     //    res.render('inbox');
     // });

    // Require someone to be logged in
    function requireLogin(req, res, next) {
      if (!req.session.agent) {
        res.redirect('/login');
      } else {
        next();
      }
    }

    function requireAdmin(req, res, next) {


        if (!req.session.agent) {
          res.render('applogin.ejs');
        } else {
          if (req.session.agent.role < 1) {
            res.redirect('/app');
          } else {
            next();
          }
        }
    }


    app.get('/admin', requireAdmin, function(req, res) {
      if (req.session.agent) {
        res.locals.agent = req.session.agent;
      }

      res.render('home');
    });

    // io.on('connection', function(socket){
    //   console.log('an agent connected');

    //   socket.on('disconnect', function(){
    //     console.log('agent disconnected');
    //   });
    // });

    // io.on('connection', function(socket){
    //     socket.emit('message', 'BRUH');
    // });

    // setInterval(function() {
    // io.clients(function(error, clients){
    //   if (error) throw error;
    //   console.log(clients); // => [PZDoMHjiu8PYfRiKAAAF, Anw2LatarvGVVXEIAAAD]
    // });
    // }, 4000);

    app.get('/app', requireLogin, function(req, res) {

          // SET SESSION TO SHORTER VARIABLE
          var agent = req.session.agent;
          console.log(agent);

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

    app.post('/add-available', function(req, res) {
      var availableAgent = req.body.email;

      if (availableAgents.indexOf(availableAgent) < 0) {
        availableAgents.push(availableAgent);
      }

      res.json(availableAgents);

    });

    app.post('/remove-available', function(req, res) {
      var availableAgent = req.body.email;

      var index = availableAgents.indexOf(availableAgent);

      if (index > -1) {
        availableAgents.splice(index, 1);
      }

      res.json(availableAgents);

    });



    // This is the endpoint your Twilio number's Voice Request URL should point at
    app.post('/inbound', function(req, res, next) {


      var theChosenOne = availableAgents[Math.floor(Math.random()*availableAgents.length)];
      // Randomly choose an agent that's available from the array of active agents

      var agent = [];

          client.query('SELECT * FROM agents WHERE email = $1', [theChosenOne], function(err, result) {
              if (err) {
                console.log(err);
              } else {

                // if (result.rows.length > 0) {

                    agent.push(result.rows[0]);
                    // Push said agent to scoped array, initiate the call to that agent
                    initiateCall(req, res, theChosenOne, agent);

                // } else {
                //     // We return TwiML to enter the same conference
                //     var twiml = new twilio.TwimlResponse();
                //     twiml.reject(function(node) {
                //         reason: "busy"
                //     });
                //     res.set('Content-Type', 'text/xml');
                //     res.send(twiml.toString());
                //     console.log(twiml.toString());
                // }
              }
          });

    });

    function initiateCall(req, res, theChosenOne, agent) {
      // conference name is random number between 1 and 10000 -- stored in app memory
      var conferenceName = Math.floor(Math.random() * 10000).toString();

      var callInfo = {
        conferenceName: conferenceName,
        from: req.body.Caller,
        city: req.body.CallerCity,
        state: req.body.CallerState,
        zipCode: req.body.CallerZip,
        callSid: req.body.CallSid,
        agentCallSid: null
        // agentCallSid will be set upon trying to transfer to an agent
      }
      storage.setItem(agent[0].email, callInfo);
      // Will replace 'gutermanj@gmail.com' with randomly chosen agent to accept the call


      // console.log("INBOUND CONFERENCE NAME: " + callInfo);
      // Here we will set the storage data with the conferenceName and the randomly selected agent to accept
      //    the inbound call!

        // NEW PROCESS -----------------------------------------------------------------------------------------------------
        // *****************************************************************************************************************
        // node-persist -- using this for temp persistence of conference room name
        // By default, storage data will automatically written in persistence in addition to memory!

        // User Object in mongoDB will hold their name, email (important), agent phoneNumber, and currentConference (important)

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
        url: "https://sudocall.herokuapp.com/join_conference?conferenceId=" + conferenceName,
        from: config.inboundPhonenumber,
        to: "+1" + agent[0].phone_number,
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
      console.log(twiml.toString());
      res.set('Content-Type', 'text/xml');
      res.send(twiml.toString());
    }

    // This is the endpoint that Twilio will call when you answer the phone
    app.post("/join_conference", function(req, res, next) {
      var conferenceName = req.query.conferenceId;
      // Dont change this

      // We return TwiML to enter the same conference
      var twiml = new twilio.TwimlResponse();
      twiml.dial(function(node) {
        node.conference(conferenceName, {
          startConferenceOnEnter: true,
          beep: false
        });
      });
      res.set('Content-Type', 'text/xml');
      res.send(twiml.toString());
    });

    app.post("/place_caller_on_hold", function(req, res) {

        twilioClient.calls(storage.getItem(req.session.agent.email).callSid).update({
          url: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.guitars",
          method: "POST"
        }, function(err, call) {
          console.log(call);
          res.json("Caller Placed on Hold");
        });
        /*
            Update the call with consumer, place them in seperate conference room with hold music
            While we find an agent to transfer them to
        */


    });

    app.post("/terminate_all_calls", function(req, res) {

        twilioClient.calls(storage.getItem(req.session.agent.email).callSid).update({
            status: 'completed'
        });

        twilioClient.calls(storage.getItem(req.session.agent.email).agentCallSid).update({
            status: 'completed'
        });

        res.json("Terminated All Calls");

    });

    app.post("/transfer_to_agent", function(req, res, next) {

        var conferenceName = storage.getItem(req.session.agent.email).conferenceName;
        // This will be changed to a getItem() from storage data in app memory

        var agent = [];

        var getAgent = client.query('SELECT * FROM clients WHERE email = $1', [req.body.agentEmail]);

        getAgent.on('row', function(row) {
            agent.push(row);
        });

        getAgent.on('end', function() {

            console.log(agent);

            twilioClient.calls.create({
                to: agent[0].phone_number,
                // THIS IS WHERE THE AGENCY'S PHONE NUMBER WILL GO WHEN OUR AGENT TRANSFERS
                from: config.inboundPhonenumber,
                url: "https://sudocall.herokuapp.com/join_conference?conferenceId=" + conferenceName
            }, function(err, call) {

                var storedAgentData = storage.getItem(req.session.agent.email);
                storedAgentData.agentCallSid = call.sid;

                storage.setItem(req.session.agent.email, storedAgentData.agentCallSid);

                /*

                    Successfuly set new agentcallsid for joining calls together later

                */

            });

            var twiml = new twilio.TwimlResponse();
            twiml.dial(function(node) {
                node.conference(conferenceName, {
                    startConferenceOnEnter: true
                });
            });
            res.set('Content-Type', 'text/xml');
            res.send(twiml.toString());
            console.log(twiml.toString());

        });


    });

    app.post('/resume_call', function(req, res) {
        // RESUME CALL WITH CONSUMER THAT IS ON HOLD
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
        var query = client.query('SELECT * FROM agents WHERE email = $1', [emailInput]);
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
                    res.redirect('/admin');
                  } else {
                    // If they don't match
                    res.redirect('/admin');
                  }
                  } else {
                  res.redirect('/admin');
                } // For some reason I have to check if it's undefined as well as
                  // null or SQL will yell at us
          }
        }); // query on end
      }); //pg connect
    });

    app.get('/signup', function(req, res) {
        res.render('appsignup.ejs');
    });

    app.post('/signup', function(req, res, next) {
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

        console.log(data);
        // ROLES -----------------
        // 0 = Phone Rep
        // 1 = Manager
        // 2 = Software Developer
        // 3 = Agency
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
            client.query("INSERT INTO agents(first_name, last_name, email, password, role, inbound, outbound) values($1, $2, $3, $4, $5, $6, $7)", [data.first_name, data.last_name, data.email, data.password, data.role, data.inbound, data.outbound], function(err) {
              if (err) {
                console.log(err);
              }
            });
            // SQL Query > Last account created
            var query = client.query("SELECT * FROM agents");
            // Stream results back one row at a time
            query.on('row', function(row) {
                results.push(row);
            });
            // After all data is returned, close connection and return results
            query.on('end', function() {
                done();
                console.log(results);
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


    /* Angular Routes */

    app.get('/api/get_agents', function(req, res) {

        var agents = [];

        var getAgents = client.query('SELECT * FROM clients WHERE online_status = $1 ORDER BY bid DESC', [true]);

        getAgents.on('row', function(row) {
            agents.push(row);
        });

        getAgents.on('end', function() {
            res.json(agents);
        });

    });



    /* End Angular Routes */

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
  });
// };

var port = normalizePort(config.port || '3000');
app.set('port', port);

http.listen(port, function() {
  console.log("Listening on port: " + port)
});
var debug = require('debug')('sudo-call:server');

/**
 * Listen on provided port, on all network interfaces.
 */

// server.listen(port);
// server.on('error', onError);
// server.on('listening', onListening);

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
