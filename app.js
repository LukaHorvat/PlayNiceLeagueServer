// var mongoose = require("mongoose");

// mongoose.connect("mongodb://localhost/");

// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error:'));
// db.once('open', function callback () {
//   console.log("Connected to database");
// });

var submitionQueue = [];
var clients = [];

var net = require('net');

net.createServer(function (socket) {
 
	socket.name = socket.remoteAddress + ":" + socket.remotePort 
 
	clients.push(socket);
 
	socket.on('data', function (data) {
		var req = JSON.parse(data.toString("utf-8"));
		if (typeof req === "undefined") return;
		if (req.type === "submit") {
			if (req.report) {
				var rep = req.report;
				if (rep.reporter && rep.target && rep.rating) {
					submitionQueue.push(rep);
					processSubmitions();
				}
			}
		}
		if (req.type === "lookup") {
			if (req.target) {
				getRating(req.target, function (rating) {
					socket.write(rating);
				});
			}
		}
	});
 
	socket.on('end', function () {
		clients.splice(clients.indexOf(socket), 1);
	});

	socket.on('error', function (exc) {
    	console.log("ignoring exception: " + exc);
	});
 
}).listen(5000);

//placeholder
var getRating = function (target, callback) {
	callback(100);
};

var matchHistoryCache = {};
var reportCache = {};

//placeholder
var checkMatchHistory = function (reporter, target, callback) {
	var cache = matchHistoryCache[reporter];
	if (Array.isArray(cache))
	{
		if (cache.indexOf(target) !== -1)
		{
			callback(true);
			return;
		}
	}

	//some code checking the match history
	//if true
	callback(true);
	//else
	//callback(false);
}

var processSubmitions = function () {
	while (submitionQueue.length > 0) {
		var rep = submitionQueue.shift();
		checkMatchHistory(rep.reporter, rep.target, function (pass) {
			if (!pass) return;
			storeReport(rep);
		});
	}
}

var storeReport = function (report) {
	if (!reportCache[report.reporter]) {
		reportCache[report.reporter] = []
		for (var i = 0; i < 4; ++i) reportCache[report.reporter][i] = {date: 0};
	}
	var cache = reportCache[report.reporter];
	console.log("Difference in seconds since the oldest submit: " + ((Date.now() - cache[0].date) / 1000));
	if (Date.now() - cache[0].date >= 900000) { //15 minutes cooldown
		cache.shift();
		cache.push(
		{
			reporter: report.reporter,
			target: report.target,
			rating: report.rating,
			date: Date.now()
		});
	} else {
		console.log("User " + report.reporter + " tried to submit more than 4 reports in the last 15 minutes");
	}
}