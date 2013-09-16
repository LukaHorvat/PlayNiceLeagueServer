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
			console.log("Banned ip, closing connection");
			ban.time = Date.now();
			response.write(JSON.stringify({
				error: "Banned ip"
			}));
			response.end();
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
			console.log("Getting player info");
			_.each(req.targets, function (target, index, list) {
				storage.getPlayer(target.toLowerCase(), req.server, function (player) {
					array.push(player);
					count++;
					if (count == 4) {
						console.log(array);
						response.write(JSON.stringify({
							players: array
						}));
						response.end();
					}
				});
			});
		} else if (req.type === "submit") {
			console.log("Checking daily API calls");
			storage.getAPICalls(function (calls) {
				console.log("Daily: " + calls);
				if (calls >= 450)
				{
					console.log("TOO MANY REQUESTS, NEED MORE MONEY");
					response.end();
					return;
				} else {
					console.log("Checking submit validity");
					checkSubmitValidity(req.reporter.toLowerCase(), req.reportedId, req.server, function (res) {
						if (res === "API DOWN") {
							console.log("API probably down, terminated request");
							response.write(JSON.stringify({
								error: "API down"
							}));
							response.end();
							return;
						}
						if (res.requiredAPI) {
							storage.incrementAPICalls();
						}
						if (res.valid) {
							console.log("Valid submit");
							storage.addRating(req.reportedName.toLowerCase(), req.server, req.rating, function () {
								if (req.rating === -1) {
									if (["solo", "quitter", "bully"].indexOf(req.tag) === -1) throw new Error("The tag isn't recognized");
									storage.addTag(req.reportedName.toLowerCase(), req.server, req.tag);
								}
								console.log("Added rating");
							});
							response.write(JSON.stringify({
								status: "success"
							}));
							response.end();
						} else {
							console.log("Invalid report, banning IP: " + ip);
							banList[ip] = {
								time: Date.now()
							};
							response.write(JSON.stringify({
								error: "Invalid report"
							}));
							response.end();
						}
					});
				}
			});
		}
	} catch (err) {
		console.log("Bad data, error: " + err);
		console.log("banned IP: " + ip);
		banList[ip] = {
			time: Date.now()
		};
		response.write(JSON.stringyfy({
			error: "Bad data"
		}));
		response.end();
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