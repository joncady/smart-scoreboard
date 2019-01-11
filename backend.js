const express = require('express');
const request = require("request");
const { PythonShell } = require('python-shell');
const opn = require('opn');	
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const smashgg = require('smashgg.js');

app.use(express.static('public'))

app.get('/', function (req, res) {
	res.sendFile(__dirname + '/index.html');
});

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
})

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

// app.get("/smasher", (req, res) => {
//     let options = {
//         args: [req.query.name, req.query.game]
//     }
    
//     PythonShell.run('scraper/smasher.py', options, (err, results) => {
//         if (err) throw err;
// 		let toSend = JSON.parse(results);
//         res.send(toSend);
//     });
// });

io.on('connection', function (socket) {
	socket.on('update', function (data) {
		io.emit('update', data);
	});
	console.log('a user connected');
});

http.listen(3000, function () {
	opn('http://localhost:3000/', { app: ["chrome", "--new-window"]});
});