//var client = net.connect({host: "prod.eun1.lol.riotgames.com", port: 2099}, function () {

var net = require("net");

var client = net.connect({host: "prod.eun1.lol.riotgames.com", port: 2099}, function () {
	console.log("Connected");
	var data = "\3";
	client.write(data, "binary");
	data = "";
	for (var i = 0; i < 1536; ++i) {
		data += "\0";
	}
	console.log(data);
	client.write(data, "binary");
});

client.on("data", function (data) {
	console.log(data);
});

client.on("end", function (data) {
	console.log("Disconnected");
});
