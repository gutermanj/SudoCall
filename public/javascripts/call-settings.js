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

        function changeCallStatus(caller) {

            $('.call-status').html('Call in progress...');
            $('.waiting-phone').hide();
            $('.js-hang-up').html('<button id="hangup" class="waves-effect waves-light btn red darken-2">Hang Up</button>');
            $('.js-transfer').html("<button class='waves-effect waves-light btn green darken-2 js-transfer-button modal-trigger' href='#settings'>Transfer</button>");
            $('.main-buttons').css('margin-top', "55%");
            $('.caller-phone-number').html(caller.from);
            $('.caller-phone-number').attr("data-sid", caller.from);
            $('.caller-first-name').html("John");
            $('.caller-last-name').html("Fakerson");


            // Add Info To Right Column (Main Call Info)
            $('.phone_number_field').val(caller.from);
            $('.phone_number_label').addClass('active');

            $('.zip_code_field').val(caller.zipCode);
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

                            response.forEach(function(agent) {

                                var formattedAgent = `
                                    <li class="collection-item">
                                        <b>${agent.first_name} ${agent.last_name}</b>
                                        <a class="waves-effect waves-light btn blue darken-3 right" style='height: 24px; line-height: 24px; padding: 0 0.5rem; font-size: 12px;'><i class="material-icons right">phone</i>Dial</a>
                                    </li>
                                `

                                $('.collection').append(formattedAgent);
                            });

                            /* Dial First Agent Here */

                        }, 1000);

                    },

                    error: function(err) {
                        console.log(err);
                    }

                });

                $('.js-transfer-button').attr('disabled', true);
            }

            function startTransfer() {
                var sid = $('.caller-phone-number').data("sid");
                console.log(sid);
                $.ajax({

                    type: 'POST',

                    url: '/transfer_to_agent',

                    data: {
                        conferenceName: sid
                    },

                    success: function(response) {
                        console.log("Transfer Started");
                        // console.log(response);
                    },

                    error: function(error) {
                        console.log(error);
                    }

                });
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
        });

        // $('.js-transfer-button').click(function() {
        //     var sid = $('.caller-phone-number').data("sid");
        //     console.log(sid);
        //     $.ajax({
        //
        //         type: 'POST',
        //
        //         url: '/transfer_to_agent',
        //
        //         data: {
        //             conferenceName: sid
        //         },
        //
        //         success: function(response) {
        //             console.log("Transfer Started");
        //             // console.log(response);
        //         },
        //
        //         error: function(error) {
        //             console.log(error);
        //         }
        //
        //     });
        //
        //     $('.js-transfer-button').attr('disabled', true);
        // });

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
