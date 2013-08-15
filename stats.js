(function () {
	var https = require("https");
	var _ = require("underscore");
	var cache = [];

	getLastPlayers = function (name, server, callback) {
		var now = Date.now();
		for (var i = 0; i < cache.length; ++i) {
			if (now - cache[i].time > 15 * 60 * 1000) {
				cache.splice(0, 1);
				i--;
			} else {
				if (cache.summonerName === name && cache.server === server) {
					callback(cache.players);
					return;
				} 
			}
		}

		name = name.replace(/\s/g, "");
		name = name.toLowerCase();
		var options = {
			hostname: "teemojson.p.mashape.com",
			path: "/player/" + server + "/" + name + "/recent_games",
			method: "GET",
			headers: {
				"X-Mashape-Authorization": "3NcAppryFkbpvXMHeQZtlZSSAFc9EG2Q"
			}
		};
		var req = https.request(options, function(res) {
			var acc = "";
			res.on("data", function(msg){
				acc += msg.toString("utf-8");
			});
			res.on("end", function () {
				var history = JSON.parse(acc);
				var lastGame = history.data.gameStatistics.array[0];
				var players = [];
				for (var i = 0; i < lastGame.fellowPlayers.array.length; ++i) {
					if (lastGame.fellowPlayers.array[i].teamId == lastGame.teamId) {
						players.push(lastGame.fellowPlayers.array[i].summonerId);
					}
				}
				acc = "";
				cache.push(
					{"players": players, "time": now, "summonerName": name, "server": server});
				callback(players);
			});
		});
		req.end();
	}

	spamCache = [];
	checkSubmitValidity = function (reporter, reportedId, server, callback) {
		for (var i = 0; i < spamCache.length; ++i)
		{
			if (now - spamCache[i].time > 15 * 60 * 1000) {
				cache.splice(0, 1);
				i--;
			} else if (spamCache.reporter === reporter && spamCache.reportedId === reportedId) {
				cache.splice(0, 1);
				spamCache.push({reporter: reporter, reportedId: reportedId, time: Date.now()});
				callback(false);
				return;
			}
		}
		getLastPlayers(reporter, server, function (list) {
			console.log(list);
			spamCache.push({reporter: reporter, reportedId: reportedId, time: Date.now()});
			if (list.indexOf(reportedId) !== -1) callback(true);
			else callback(false);
		});
	};

	module.exports = this;
}).call(this);