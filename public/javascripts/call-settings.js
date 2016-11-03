        var scriptSource = (function() {
            var scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1].src
        }());

        var params = parseQueryString(scriptSource.split('?')[1]);

        // Utility function to convert "a=b&c=d" into { a:'b', c:'d' }
        function parseQueryString(queryString) {
            var params = {};
            if (queryString) {
                var keyValues = queryString.split('&');
                for (var i=0; i < keyValues.length; i++) {
                    var pair = keyValues[i].split('=');
                    params[pair[0]] = pair[1];
                }
            }
            return params;
        }

        var token = params.vartoken;
        var agent = params.varagent;
        console.log(agent);
        // SET UP PARAMS FROM HTML ( i.e. <%= token %> ) ------------------------------------------------------------

        var powerOnAudio = document.createElement('audio');
        powerOnAudio.setAttribute('src', 'https://static.twilio.com/libs/twiliojs/refs/d682d91/sounds/outgoing.mp3');
        var powerOffAudio = document.createElement('audio');
        powerOffAudio.setAttribute('src', 'https://static.twilio.com/libs/twiliojs/refs/d682d91/sounds/incoming.mp3');

        var power = 1;
        // Set up the Twilio "Device" (think of it as the browser's phone) with
        // our server-generated capability token, which will be inserted by the
        // EJS template system:
        Twilio.Device.setup(token, { audioConstraints: true } );

        $('.js-main-power').click(function() {
            power++;
            powerColorStatus();
        });

        function powerColorStatus() {
            if (power % 2 === 0) {
                $('.js-main-power').removeClass('red-power');
                $('.js-main-power').addClass('green-power');
                $('.call-status').html('Waiting...');
                powerOnAudio.play();
                startMainTimer();
                addAvailability();

            } else {
                $('.js-main-power').removeClass('green-power');
                $('.js-main-power').addClass('red-power');
                $('.call-status').html('Offline...');
                powerOffAudio.play();
                stopMainTimer();
                removeAvailability();
            }
        }
        // Register an event handler to be called when there is an incoming
        // call:
        Twilio.Device.incoming(function(connection) {
            //For demo purposed, automatically accept the call
            if (power % 2 === 0) {
                connection.accept();
                // Current Incoming Caller Info
                grabCallInfo();
                stopMainTimer()
                startMainTimer();
            } else {
                connection.ignore();
            }
        });

        var sampleCaller = {
            from: "+5613811223",
            zipCode: "33426",
            city: "Boynton Beach",
            state: "Florida"
        }

        // changeCallStatus(sampleCaller);
        // UI Call Sample

        function changeCallStatus(caller) {

            $.ajax({

                type: 'POST',

                url: 'get_script',

                data: {
                    scriptPage: "intro",
                    caller: caller
                },

                success: function(script) {
                    $('.current-script').html(script);
                },

                error: function(err) {
                    console.log(err);
                }



            });

            $('.call-status').html('Call in progress...');
            $('.waiting-phone').hide();
            $('.js-hang-up').html('<button id="hangup" class="waves-effect waves-light btn red darken-2">Hang Up</button>');
            $('.js-transfer').html("<button class='waves-effect waves-light btn green darken-2 js-transfer-button modal-trigger' href='#settings'>Transfer</button>");
            $('.main-buttons').css('margin-top', "55%");
            $('.caller-phone-number').html(caller.phone_number);
            $('.caller-phone-number').attr("data-sid", caller.phone_number);
            $('.caller-first-name').html(caller.first_name);
            $('.caller-last-name').html(caller.last_name);


            // Add Info To Right Column (Main Call Info)

            $('.first_name_field').val(caller.first_name);
            $('.first_name_label').addClass('active');

            $('.last_name_field').val(caller.last_name);
            $('.last_name_label').addClass('active');

            $('.phone_number_field').val(caller.phone_number);
            $('.phone_number_label').addClass('active');

            $('.zip_code_field').val(caller.zip_code);
            $('.zip_code_label').addClass('active');

            $('.city_field').val(caller.city);
            $('.city_label').addClass('active');

            $('.state_field').val(caller.state);
            $('.state_label').addClass('active');

            $('#hangup').click(function() {
                Twilio.Device.disconnectAll();
                emptyCallerInfo();
                // Top Left Call Status
                $('.call-status').html('Waiting...');
                $('.js-hang-up').empty();
                $('.js-transfer').empty();
                $('.waiting-phone').show();
            });

            $('.js-transfer-button').click(function() {

                placeCallerOnHold();
                // Commented for testing

                initializeTransfer();

            });

            $('.modal-trigger').leanModal({
                 dismissible: false
            });

            function placeCallerOnHold() {

                $.ajax({

                    type: 'POST',

                    url: '/place_caller_on_hold',

                    success: function(response) {
                        console.log(response);
                    },

                    error: function(err) {
                        console.log(err);
                    }

                });

            }

            function initializeTransfer() {
                $.ajax({

                    url: '/api/get_agents',

                    success: function(response) {


                        setTimeout(function() {

                            $('.indeterminate-bar').hide();

                            $('.availableAgents').empty();

                            response.forEach(function(agent) {

                                var formattedAgent = `
                                    <li class="collection-item">
                                        <b>${agent.first_name} ${agent.last_name}</b>
                                        <a class="waves-effect waves-light btn blue darken-3 right dial-button js-dial-agent" style='height: 24px; line-height: 24px; padding: 0 0.5rem; font-size: 12px;' data-agent-email='${agent.email}'><i class="material-icons right">phone</i>Dial</a>
                                    </li>
                                `

                                $('.collection').append(formattedAgent);
                            });

                            $('.js-dial-agent').on('click', function() {

                                if ($(this).hasClass('dialing')) {
                                    alert("Please end your current call before dialing another agent!");
                                } else {

                                    if ($(this).hasClass('js-hang-up-agent')) {

                                            $.ajax({

                                                type: 'POST',

                                                url: '/cancel_agent_dial',

                                                success: function(response) {

                                                    $('.js-hang-up-agent').parent().fadeOut(500);

                                                    $('.dial-button').addClass('js-dial-agent');
                                                    $('.dial-button').removeClass('dialing');

                                                },

                                                error: function(err) {
                                                    console.log(err);
                                                }

                                            });

                                    } else {

                                        var agentEmail = $(this).data('agent-email');

                                        dialAgent(agentEmail);



                                        $('.dial-button').not(this).addClass('dialing');

                                        $(this).addClass('js-hang-up-agent');
                                        $(this).text("Hang Up");
                                        $(this).removeClass("blue");
                                        $(this).addClass("red");

                                        var bridgeButton = `
                                            <a class="waves-effect waves-light btn teal darken-1 right js-bridge" style='height: 24px; line-height: 24px; padding: 0 0.5rem; font-size: 12px; margin-right: 1%;' data-agent-email='${agent.email}'><i class="material-icons right">swap_horiz</i>Join</a>
                                        `

                                        $(this).parent().append(bridgeButton);

                                        $('.js-bridge').on('click', function() {

                                            $.ajax({

                                                type: 'POST',

                                                url: '/bridge_calls',

                                                success: function(response) {

                                                    Twilio.Device.disconnectAll();
                                                    emptyCallerInfo();
                                                    // Top Left Call Status
                                                    $('.call-status').html('Waiting...');
                                                    $('.js-hang-up').empty();
                                                    $('.js-transfer').empty();
                                                    $('.waiting-phone').show();

                                                },

                                                error: function(err) {
                                                    console.log(err);
                                                }

                                            });

                                        });

                                    }

                                }

                            });

                            function dialAgent(agentEmail) {

                                $.ajax({

                                    type: 'POST',

                                    url: '/transfer_to_agent',

                                    data: {
                                        agentEmail: agentEmail
                                    },

                                    success: function(response) {
                                        console.log(response);
                                    },

                                    error: function(error) {
                                        console.log(error);
                                    }

                                });


                            }


                        }, 1000);

                    },

                    error: function(err) {
                        console.log(err);
                    }

                });
                $('.js-transfer-button').attr('disabled', true);

            }




        }
        // Register an event handler for when a call ends for any reason
        Twilio.Device.disconnect(function(connection) {
            $('.call-status').html('Waiting...');
            $('.js-hang-up').empty();
            $('.js-transfer').empty();

            emptyCallerInfo();
            stopMainTimer();
            startMainTimer();
            $('.waiting-phone').show();
        });

        // Add a click event for the button, which will hang up the current
        // call when clicked:
        $('#hangup').click(function() {
            Twilio.Device.disconnectAll();
            emptyCallerInfo();
            // Top Left Call Status
            $('.call-status').html('Waiting...');
            $('.js-hang-up').empty();
            $('.js-transfer').empty();
            $('.waiting-phone').show();

            /*

                We have to send an ajax request to hang up and complete
                all calls we've been on (consumer and agent SIDs)

            */

        });

        function emptyCallerInfo() {
            $('.caller-phone-number').empty();
            $('.caller-first-name').empty();
            $('.caller-last-name').empty();

            $('.first_name_field').val("");
            $('.first_name_label').removeClass('active');

            $('.last_name_field').val("");
            $('.last_name_label').removeClass('active');

            $('.phone_number_field').val("");
            $('.phone_number_label').removeClass('active');

            $('.zip_code_field').val("");
            $('.zip_code_label').removeClass('active');

            $('.city_field').val("");
            $('.city_label').removeClass('active');

            $('.state_field').val("");
            $('.state_label').removeClass('active');

            $('.dob_field').val("");
            $('.dob_label').removeClass('active');

            $('.main-buttons').css('margin-top', '0%');

            $('.current-script').empty();

            $.ajax({
                type: 'POST',

                url: '/terminate_all_calls',

                success: function(response) {
                    console.log(response);
                },

                error: function(err) {
                    console.log(err);
                }
            });

        }

        function grabCallInfo() {
            $.ajax({

                type: 'GET',

                url: '/currentCall',

                success: function(response) {
                    // console.log(response);
                    changeCallStatus(response);

                },

                error: function(error) {
                    console.log(error);
                }

            });
        }

        function startMainTimer() {

            $('.minute').html(0);
            $('.currentSecond').html(0);
            $('.currentTenthSecond').html(0);

            var currentMinute = $('.minute').text();
            var currentSecond = $('.first_second').text();
            var currentTenthSecond = $('.second_second').text();

            currentTenthSecond++;
            var newTenthSecond = currentTenthSecond;
            $('.second_second').html(newTenthSecond);

            timerInterval = setInterval(function() {
                if (currentTenthSecond % 9 === 0 && currentTenthSecond !== 0) {
                    currentSecond++;
                    var newSecond = currentSecond;
                    var splitNewSecond = newSecond.toString().split(" ");
                    currentTenthSecond = 0;
                    console.log(splitNewSecond);
                    $('.first_second').html(splitNewSecond[0]);
                    $('.second_second').html(0);
                } else {
                    currentTenthSecond++;
                    var newTenthSecond = currentTenthSecond;
                    $('.second_second').html(newTenthSecond);
                }

                if (currentSecond === 6) {
                    currentMinute++;
                    var newMinute = currentMinute;
                    $('.minute').html(newMinute);

                    $('.first_second').html(0);
                    $('.second_second').html(0);

                    currentSecond = 0;
                    currentTenthSecond = 0;
                }
            }, 1000);
        }

        function stopMainTimer() {

            $('.minute').html(0);
            $('.first_second').html(0);
            $('.second_second').html(0);

            clearInterval(timerInterval);

        }


        function addAvailability() {

            $.ajax({

                type: 'POST',

                url: 'add-available',

                data: {
                    email: agent
                },

                success: function(response) {
                    console.log("OK");
                    console.log(response);
                },

                error: function(error) {
                    console.log("NOT OK");
                }

            });

        }

        function removeAvailability() {

            $.ajax({

                type: 'POST',

                url: 'remove-available',

                data: {
                    email: agent
                },

                success: function(response) {
                    console.log("OK");
                    console.log(response);
                },

                error: function(error) {
                    console.log("NOT OK");
                }

            });

        }

        $(window).bind('beforeunload', function() {
            // If an agent refreshes or loses connection while online
            // They will be removed from the available agents list
            $.ajax({

                type: 'POST',

                url: 'remove-available',

                data: {
                    email: agent
                },

                success: function(response) {
                    console.log("OK");
                    console.log(response);
                },

                error: function(error) {
                    console.log("NOT OK");
                }

            });
        });


        // // Make an outbound call to the number given in the text field:
        // $('#call').on('click', function() {
        //     // The properties of this object will be sent as POST
        //     // Parameters to URL which generates TwiML.
        //     Twilio.Device.connect({
        //         CallerId:'+14505556677', // Replace this value with a verified Twilio number:
        //                                  // https://www.twilio.com/user/account/phone-numbers/verified
        //         PhoneNumber:$('#number').val() //pass in the value of the text field
        //     });
        // });

    $(document).ready(function() {
        $('select').material_select();

        $('.datepicker').pickadate({
            selectMonths: true, // Creates a dropdown to control month
            selectYears: 216 // Creates a dropdown of 15 years to control year
        });

        $('.dob_label').pickadate({
            selectMonths: true, // Creates a dropdown to control month
            selectYears: 216 // Creates a dropdown of 15 years to control year
        });


    });

    $(document).ready(function(){
        // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
        $('.modal-trigger').leanModal({
             dismissible: false
        });

    });

    $(document).ready(function() {

        var navHeight = $('.main-nav').height();

        var callStatusHeight = $('.main-call-status').height();

        var footerHeight = $('.footer-nav').height();

        var totalMarginHeight = navHeight + callStatusHeight + footerHeight;


        var mainCallHeight = $('body').height() - totalMarginHeight;


        $('.main-info').css('height', mainCallHeight);



        /*                          */

        console.log("body height: " + $('body').height());

        console.log("Main Nav: " + $('.main-nav').height());

        console.log("Main Call Status: " + $('.main-call-status').height());


    });
