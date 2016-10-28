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

        function changeCallStatus(caller) {
            $('.call-status').html('Call in progress...');
            $('.waiting-phone').hide();
            $('.js-hang-up').html('<button id="hangup" class="waves-effect waves-light btn red darken-2">Hang Up</button>');
            $('.js-transfer').html('<button class="waves-effect waves-light btn green darken-2 js-transfer-button">Transfer</button>');
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

                $('.js-transfer-button').attr('disabled', true);
            });


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

        $('.js-transfer-button').click(function() {
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

            $('.js-transfer-button').attr('disabled', true);
        });

        function emptyCallerInfo() {
            $('.caller-phone-number').empty();
            $('.caller-first-name').empty();
            $('.caller-last-name').empty();

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
        $('.modal-trigger').leanModal();
    });

    $(document).ready(function() {

<<<<<<< HEAD
        console.log($('.main-script').height());

        var navHeight = $('.main-nav').height();

        var totalMarginHeight = navHeight * 7.16;

        console.log("Total Margin Height: " + totalMarginHeight);

        var mainCallHeight = $(document).height() - totalMarginHeight;

        console.log("Main Call Height: " + mainCallHeight);

        $('.main-info').css('height', mainCallHeight);
=======
        console.log($(document).height());

        var newHeight = $(document).height() / 2.2;

        console.log(newHeight);

        $('.main-info').css('height', newHeight);
>>>>>>> d228496823dae770ec7e4876a095eade1460a21b

    });
