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
var stylus = require("stylus");
var app = express();

app.configure(function () {
	app.use(express.bodyParser());
});

app.set("views", __dirname + "/views");
app.set("view engine", "jade");

function compile(str, path) {
	return stylus(str)
		.set('filename', path);
}
app.use(stylus.middleware({ 
	src: __dirname + '/public', 
	compile: compile
}));
app.use(express.static(__dirname + '/public'));

banList = {};

app.post("/", function (request, response) {
	if (request.get("X-Forwarded-For"))	{
		var ip = request.get("X-Forwarded-For").split(",")[0];
	} else {
		var ip = "local";
	}
	console.log("Connection from: " + ip);
  	response.setHeader('Content-Type', 'application/json');

	var ban = banList[ip];
	if (ip !== "local" && ban) {
		if (Date.now() - ban.time > 15 * 60 * 1000) delete banList[ip];
		else {
			ban.time = Date.now();
			response.send({
				error: "Banned ip"
			});
			return;
		}
	} 
	var req = request.body;
	try {
		if (["na", "euw", "eun"].indexOf(req.server) === -1) throw new Error("The server code isn't recognized");
		console.log(req);
		if (req.type === "lookup") {
			var count = 0;
			var array = [];
			_.each(req.targets, function (target, index, list) {
				storage.getPlayer(target.toLowerCase(), req.server, function (player) {
					array.push(player);
					count++;
					if (count == 4) {
						console.log(array);
						response.send(JSON.stringify({
							players: array
						}));
					}
				});
			});
		} else if (req.type === "submit") {
			if (storage.getAPICalls() >= 450) {
				console.log("TOO MANY REQUESTS, NEED MORE MONEY");
				return;
			}
			checkSubmitValidity(req.reporter.toLowerCase(), req.reportedId, req.server, function (res) {
				if (res.requiredAPI) {
					storage.incrementAPICalls();
				}
				if (res.valid) {
					storage.addRating(req.reportedName.toLowerCase(), req.server, req.rating, function () {
						if (req.rating === -1) {
							if (["solo", "quitter", "bully"].indexOf(req.tag) === -1) throw new Error("The tag isn't recognized");
							storage.addTag(req.reportedName.toLowerCase(), req.server, req.tag);
						}
					});
					console.log("Success");
					response.send(JSON.stringify({
						status: "success"
					}));
				} else {
					console.log("Invalid report, banning IP: " + ip);
					banList[ip] = {
						time: Date.now()
					};
					response.send(JSON.stringify({
						error: "Invalid report"
					}));
				}
			});
		}
	} catch (err) {
		console.log("Bad data, error: " + err);
		console.log("banned IP: " + ip);
		response.send({
			error: "Bad data"
		});
		banList[ip] = {
			time: Date.now()
		};
	}
});

app.get("/lookup/:server/:name", function (request, response) {
	storage.getPlayer(request.params.name.toLowerCase(), request.params.server, function (player) {
		response.render("playerdisplay", player);
	});
});

app.get("/", function (request, response) {
	response.render("lookup");
});

app.listen(process.env.PORT);