if(process.env.NODETIME_ACCOUNT_KEY) {
  	require('nodetime').profile({
    	accountKey: process.env.NODETIME_ACCOUNT_KEY,
    	appName: 'Play Nice League' // optional
  	});
}

var storage = require("./storage");
var stats = require("./stats");
var _ = require("underscore");

var express = require("express");
var app = express();

app.configure(function () {
	app.use(express.bodyParser());
});

banList = {};

app.post("/", function (request, response) {
	var ban = banList[request.ip];
	if (ban) {
		if (Date.now() - ban.time > 15 * 60 * 1000) delete banList[request.ip];
		else {
			ban.time = Date.now();
			return;
		}
	} 
  	response.setHeader('Content-Type', 'application/json');
	var req = request.body;
	try {
		if (["na", "euw", "eun"].indexOf(req.server) === -1) throw new Error("The server code isn't recognized");
		console.log(req);
		if (req.type === "lookup") {
			var count = 0;
			var array = [];
			_.each(req.targets, function (target, index, list) {
				storage.getPlayer(target, req.server, function (player) {
					array.push(player);
					count++;
					if (count == 4) {
						response.send(JSON.stringify({
							players: array
						}));
					}
				});
			});
		} else if (req.type === "submit") {
			checkSubmitValidity(req.reporter, req.reportedId, req.server, function (res) {
				if (res) {
					storage.addRating(req.reportedName, req.server, req.rating, function () {
						if (req.rating === -1) {
							if (["solo", "quitter", "bully"].indexOf(req.tag) === -1) throw new Error("The tag isn't recognized");
							storage.addTag(req.reportedName, req.server, req.tag);
						}
					});
				} else {
					console.log("Invalid report, banned IP: " + request.ip);
					banList[request.ip] = {
						time: Date.now()
					};
				}
			});
		}
	} catch (err) {
		console.log("Bad data, error: " + err);
		console.log("banned IP: " + request.ip);
		banList[request.ip] = {
			time: Date.now()
		};
	}
});

app.listen(process.env.PORT);