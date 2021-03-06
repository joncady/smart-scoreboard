const express = require('express');
const request = require("request");
const ip = require('ip');
var cors = require('cors');
const { PythonShell } = require('python-shell');
const opn = require('opn');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const smashgg = require('smashgg.js');
const PORT = 3000;
app.use(cors());
app.use(express.static('dashboard'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
    path: 'output/matches.csv',
    header: [
		{ id: "player1", title: "player1" },
		{ id: "player2", title: "player2" },
		{ id: "player3", title: "player3" },
		{ id: "player4", title: "player4" },
		{ id: "doubles", title: "doubles" },
		{ id: "bracket", title: "bracket" }
    ]
});

let currentData = {
	gameInfo: {
		player1: "",
		player2: "",
		score1: 0,
		score2: 0,
		bracket: "",
		link: "",
		date: "",
		location: ""
	},
	commInfo: {
		commName1: "",
		commTwitter1: "",
		commName2: "",
		commTwitter2: ""
	}, doubles: {
		enabled: false,
		content: {
			player3: "",
			player4: ""
		}
	}, teams:	{
		team1: "",
		team2: ""
	}, rankings: {
		lastRankings: ""
	}
};

app.get('/tournament', function (req, res) {
	var { Tournament } = smashgg;
	let tourneySlug = req.query.name;
	Tournament.getTournament(tourneySlug).then((tournament) => {
		let tourneyId = tournament.getId();
		let tourneyName = tournament.getName();
		let eventsList = [];
		tournament.getAllEvents().then((events) => {
			events.forEach((event) => {
				let name = event.getName()
				let id = event.eventId;
				eventsList.push({ name: name, id: id });
			});
			let response = { status: "success", name: tourneyName, id: tourneyId, events: eventsList };
			res.send(JSON.stringify(response));
		});
	}).catch((err) => {
		res.send(JSON.stringify({ status: "fail", error: err.message }));
	});
});

app.get("/address", (req, res) => {
	res.send({ address: ip.address(), port: PORT });
});

app.get("/queue", (req, res) => {
	let id = req.query.id;
	let tourney = req.query.tournament;
	let url = `https://api.smash.gg/station_queue/${tourney}`;
	request.get(url, (error, response, body) => {
		let json = JSON.parse(body);
		if (json.data != null && json.data.entities.entrants != null) {
			let allEntrants = json.data.entities.entrants;
			let playerIds = [];
			allEntrants.filter((entrant) => {
				if (entrant.eventId == id) {
					playerIds.push(String(entrant.id));
				}
			});
			let playerInfo = json.data.entities.player;
			let fullPlayers = [];
			playerInfo.forEach((player) => {
				if (playerIds.indexOf(player.entrantId) >= 0) {
					let prefix = "";
					if (player.prefix != undefined && player.prefix != null && player.prefix != "") {
						prefix = player.prefix + " | ";
					}
					let gamerTag = player.gamerTag
					let playerObj = {
						name: player.name,
						gameName: prefix + gamerTag,
						twitter: player.twitterHandle,
						state: player.state,
						country: player.country
					}
					fullPlayers.push(playerObj);
				}
			});
			res.send(JSON.stringify({ players: fullPlayers, phase: json.data.entities.phase[0].name, status: "success" }));
		} else {
			res.send(JSON.stringify({ status: "fail" }));
		}
	});
});

app.get("/smasher", (req, res) => {
	let options = {
		args: [req.query.name, req.query.game],
		scriptPath: __dirname + "/scraper/"
	}
	console.log("Running scrape for " + req.query.name);
	PythonShell.run('smasher.py', options, (err, results) => {
		if (err) {
			console.log(err.message)
			res.send(JSON.stringify({ message: "Smasher not found, but probably exists. Please contact JC at @JC_ssb for development issues.", type: "empty" }));
		} else {
			let toSend = JSON.parse(results);
			res.send(toSend);
		}
	});
});

app.post("/match", (req, res) => {
	let match = req.body.match;
	const records = [
		{ ...match }
	];
	csvWriter.writeRecords(records)       // returns a promise
    .then(() => {
        console.log('Done.');
    });
});

io.on('connection', function (socket) {
	io.emit('update', currentData);
	socket.on('update', function (data) {
		currentData = data;
		io.emit('update', data);
	});
});

http.listen(PORT, function () {
	opn(`http://localhost:3000`, { app: ["chrome", "--new-window"] });
});