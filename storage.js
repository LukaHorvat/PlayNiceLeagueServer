(function () {

	var mongoose = require("mongoose");

	mongoose.connect("mongodb://localhost/");

	var db = mongoose.connection;
	db.on('error', console.error.bind(console, 'connection error:'));
	db.once('open', function callback () {
	  	console.log("Connected to database");
	});

	var defaultNew = function (name, serv) {
		return {
			summonerName: name, 
			server: serv, 
			upVotes: 10, 
			downVotes: 0,
			tags: {
				quitter: 0,
				solo: 0,
				bully: 0
			}
		};	
	}

	var Record = mongoose.model("Record", {
		summonerName: String, 
		server: String, 
		upVotes: Number, 
		downVotes: Number,
		tags: {
			quitter: Number,
			solo: Number,
			bully: Number
		}
	});

	var addRating = function (name, serv, rating, callback) {
		Record.findOne({
			summonerName : name, 
			server: serv
		}, function (err, record) {
			if (record === null) {
				record = new Record(defaultNew(name, serv));
			}
			if (rating > 0) record.upVotes++;
			else record.downVotes++;
			record.save(function () {
				if (typeof callback !== "undefined") callback();
			});
		});
	}

	var addTag = function (name, serv, tag, callback) {
		Record.findOne({
			summonerName : name, 
			server: serv
		}, function (err, record) {
			if (record === null) {
				record = new Record(defaultNew(name, serv));
			}
			record.tags[tag]++;
			record.save(function () {
				if (typeof callback !== "undefined") callback();
			});
		});
	}

	var getPlayer = function (name, serv, callback) {
		Record.findOne({
			summonerName: name, 
			server: serv
		}, function (err, record) {
			if (record === null) callback(defaultNew(name, serv));
			else callback(record);
		});
	}

	//for testing purposes
	var clearDatabase = function (callback) {
		db.db.dropDatabase(function () {
			if (typeof callback !== "undefined") callback();
		});
	}

	module.exports = this;
}).call(this);
