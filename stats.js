(function () {
	var https = require("https");
	var _ = require("underscore");
	var time = require("time")(Date);
	var cache = [];

	getMatchHistory = function (name, server, callback) {
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
					getMatchHistory(name, server, callback);
				}
			});
		});
		req.end();
	}

	getLastGame = function (name, server, callback) {
		name = name.replace(/\s/g, "");
		name = name.toLowerCase();

		var now = Date.now();
		for (var i = 0; i < cache.length; ++i) {
			if (now - cache[i].time > 15 * 60 * 1000) {
				cache.splice(0, 1);
				i--;
			} else {
				if (cache[i].summonerName === name && cache[i].server === server) {
					callback(cache[i]);
					return;
				} 
			}
		}

		getMatchHistory(name, server, function (history) {
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
				time: lastGame.createDate, 
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
				cache.splice(0, 1);
				i--;
			} else if (spamCache[i].reporter === reporter && spamCache[i].reportedId === reportedId && spamCache[i].server === server) {
				cache.splice(0, 1);
				spamCache.push(log);
				console.log("Reporter already reported this player");
				callback({
					valid: false,
					requiredAPI: false 
				});
				return;
			}
		}
		getLastGame(reporter, server, function (game) {
			var now = new time.Date();

			spamCache.push(log);
			now.setTimezone("America/Los_Angeles");
			if (now - new time.Date(game.time) > 5 * 60 * 1000) {
				console.log("Reporter's last game was " + (now - new time.Date(game.time)) / 1000 / 60 + " minutes ago");
				callback({
					valid: false,
					requiredAPI: true 
				});
			} else if (game.players.indexOf(reportedId) !== -1) {
			 	callback({
					valid: true,
					requiredAPI: true 
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