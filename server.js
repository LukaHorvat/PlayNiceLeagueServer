var io = require("socket.io");
var _ = require("underscore");
var storage = require("./storage");
var stats = require("./stats");

io.configure(function () { 
  	io.set("transports", ["xhr-polling"]); 
  	io.set("polling duration", 10); 
});

io.sockets.on("connection", function (socket) {
	var buffer = new Buffer(0);
	var waitFor = 0;

	//Takes a string of data, sends the number of bytes in the string and then the string itself
	respond = function (data) {
		var temp = new Buffer(data);
		var len = new Buffer(4);
		len.writeInt32LE(temp.length, 0);
		socket.write(Buffer.concat([len, temp]));
	}

	//Gets called when the whole string is recieved
	onBunch = function (data) {
		try {
			debugger;
			var req = JSON.parse(data);		
			if (["na", "euw", "eun"].indexOf(req.server) === -1) throw new Error("The server code isn't recognized");
			if (req.type === "lookup") {
				var count = 0;
				var array = [];
				_.each(req.targets, function (target, index, list) {
					storage.getPlayer(target, req.server, function (player) {
						array.push(player);
						count++;
						if (count == 4) {
							respond(JSON.stringify({
								"players": array
							}));
						}
					});
				});
			} else if (req.type === "submit")
			{
				checkSubmitValidity(req.reporter, req.reportedId, req.server, function (res) {
					if (res) {
						storage.addRating(req.reportedName, req.server, req.rating, function () {
							if (req.rating === -1) {
								if (["solo", "quitter", "bully"].indexOf(req.tag) === -1) throw new Error("The tag isn't recognized");
								storage.addTag(req.reportedName, req.server, req.tag);
							}
						});
					} else {
						//Add penalty for faulty report
					}
				});
			}
		} catch (ex) {
			console.log("Bad data:");
			console.log(data);
			console.log("Error: " + ex);
		}
	}

	//Checks if the buffer has enough data. The first 4 bytes of every message are interpreted as a number
	//that represents the number of bytes the message will contain. When enough bytes are recieved, the
	//message is interpreted as a string and sent to the onBunch function.
	processBuffer = function () {
		while (buffer.length > 0) {
			if (waitFor === 0 && buffer.length >= 4) {
				waitFor = buffer.readInt32LE(0);
				if (waitFor > 5000) socket.end();
				buffer = buffer.slice(4);
			} 
			if (buffer.length >= waitFor && waitFor > 0) {
				onBunch(buffer.toString("utf-8", 0, waitFor));
				buffer = buffer.slice(waitFor);
				waitFor = 0;
			} else {
				break;
			}
		}
	}

	socket.on("data", function (chunk) {
		buffer = Buffer.concat([buffer, chunk]);
		processBuffer();
	});

	socket.on("error", function (err) {
		console.log("Socket errored with " + err);
	});
}).listen(8442);