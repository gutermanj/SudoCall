$(document).ready(function() {


$('.account-stats').click(function() {
	$('.account-stats').load('https://sudocall.herokuapp.com/sudocall/views/index.ejs')
});

});