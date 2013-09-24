(function () {
	var https = require("https");
	var _ = require("underscore");
	var time = require("time")(Date);

	var cache = [];
	var localAPICallLimiter = {
		day: new time.Date().getDay(),
		count: 0
	}

	getMatchHistory = function (name, server, callback, rec) {
		if (typeof rec === "undefined") rec = 0;
		rec++;
		if (rec > 5) {
			console.log("Throttling repeated API calls (rec limit)");
			callback("API DOWN");
			return;
		}
		var day = new time.Date().getDay();
		if (localAPICallLimiter.day !== day) {
			localAPICallLimiter = {
				day: day,
				count: 1
			}
		} else if (localAPICallLimiter.count >= 450) {
			console.log("Throttling repeated API calls");
			callback("API DOWN");
			return;
		} else {
			localAPICallLimiter.count++;
		}
		var options = {
			hostname: "teemojson.p.mashape.com",
			path: "/player/" + server + "/" + name + "/recent_games",
			method: "GET",
			headers: {
				"X-Mashape-Authorization": "3NcAppryFkbpvXMHeQZtlZSSAFc9EG2Q"
			}
		};
		var req = https.request(options, function (res) {
			var acc = "";
			res.on("data", function(msg){
				acc += msg.toString("utf-8");
			});
			res.on("end", function () {
				history = JSON.parse(acc);
				if (history.success) {
					history.data.gameStatistics.array.sort(function (match1, match2) {
						var diff = new Date(match2.createDate) - new Date(match1.createDate);
						if (diff < 0) return -1;
						else if (diff === 0) return 0;
						else return 1;
					});
					callback(history);
				} else {
					console.log("Something went wrong with the API call. Output: ");
					console.log(JSON.stringify(history, null, 4));
					getMatchHistory(name, server, callback, rec);
				}
			});
		});
		req.end();
	}

	getLastGame = function (name, server, callback) {
		name = name.replace(/\s/g, "");
		name = name.toLowerCase();

		var now = new time.Date();
		now.setTimezone("America/Los_Angeles");
		for (var i = 0; i < cache.length; ++i) {
			if (now - cache[i].time > 15 * 60 * 1000) {
				cache.splice(0, 1);
				i--;
			} else {
				if (cache[i].summonerName === name && cache[i].server === server) {
					console.log("Getting game from cache");
					callback(cache[i]);
					return;
				} 
			}
		}

		console.log("Getting game via API");
		getMatchHistory(name, server, function (history) {
			if (history === "API DOWN") {
				callback("API DOWN");
				return;
			}
			var lastGame = history.data.gameStatistics.array[0];
			var players = [];
			for (var i = 0; i < lastGame.fellowPlayers.array.length; ++i) {
				if (lastGame.fellowPlayers.array[i].teamId == lastGame.teamId) {
					players.push(lastGame.fellowPlayers.array[i].summonerId);
				}
			}
			acc = "";
			var game = {
				players: players, 
				time: new time.Date(lastGame.createDate), 
				summonerName: name, 
				server: server
			};
			cache.push(game);
			callback(game);
		});
	}

	spamCache = [];
	checkSubmitValidity = function (reporter, reportedId, server, callback) {
		var log = {
			reporter: reporter, 
			reportedId: reportedId, 
			server: server,
			time: Date.now()
		};
		var now = Date.now();
		for (var i = 0; i < spamCache.length; ++i)
		{
			if (now - spamCache[i].time > 10 * 60 * 1000) {
				spamCache.splice(0, 1);
				i--;
			} else if (spamCache[i].reporter === reporter && spamCache[i].reportedId === reportedId && spamCache[i].server === server) {
				spamCache.splice(0, 1);
				spamCache.push(log);
				console.log("Reporter already reported this player");
				callback({
					valid: false,
					requiredAPI: false 
				});
				return;
			}
		}
		console.log("Getting last game of " + reporter);
		var currentCalls = localAPICallLimiter.count;
		getLastGame(reporter, server, function (game) {
			if (game === "API DOWN") {
				callback("API DOWN");
				return;
			}
			var now = new time.Date();

			spamCache.push(log);
			now.setTimezone("America/Los_Angeles");
			if (now - game.time > 5 * 60 * 1000) {
				console.log("Reporter's last game was " + (now - new time.Date(game.time)) / 1000 / 60 + " minutes ago");
				callback({
					valid: false,
					requiredAPI: true 
				});
			} else if (game.players.indexOf(reportedId) !== -1) {
				console.log("Report checks out");
			 	callback({
					valid: true,
					requiredAPI: currentCalls !== localAPICallLimiter.count //Is number of API calls increased, the API was obviously used 
				});
			} else {
				console.log("Reporter didn't play with the reported");
				callback({
					valid: false,
					requiredAPI: true 
				});
			}
		});
	};

	module.exports.getMatchHistory = getMatchHistory;
	module.exports.getLastGame = getLastGame;
	module.exports.checkSubmitValidity = checkSubmitValidity;
}).call(this);