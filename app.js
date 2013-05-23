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
		if (req.type === "submit")
		{
			if (Array.isArray(req.ratings))
			{
				for (var i = 0; i < req.ratings.length; ++i)
				{
					var rep = req.ratings[i];
					if (rep.reporter && rep.target && rep.rating)
					{
						submitionQueue.push(rep);
						processSubmitions();
					}
				}
			}
		}
		console.log(submitionQueue);
	});
 
	socket.on('end', function () {
		clients.splice(clients.indexOf(socket), 1);
	});
 
}).listen(5000);

//placeholder
var checkMatchHistory = function (reporter, target, callback) {
	callback(true);
};

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
	
};