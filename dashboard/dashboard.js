'use strict';

let doubles = false;
let tournamentId;
let players;
let phase;
let lastRankings;

$(function () {
    var socket = io('http://localhost:3000');
    socket.on('update', function (data) {
        let overlayContent = data.gameInfo;
        setContent(overlayContent);
        let commentary = data.commInfo;
        setContent(commentary);
        let teams = data.teams;
        setContent(teams);
        if (data.doubles.enabled) {
            $(".doubles").show();
            let dubsEl = data.doubles.content;
            setContent(dubsEl);
        } else {
            $(".doubles").hide();
        }
    });
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        let player1 = $("#player1").val();
        let player2 = $("#player2").val();
        let player3 = $("#player3").val();
        let player4 = $("#player4").val();
        let team1 = $("#team1").val();
        let team2 = $("#team2").val();
        let score1 = $("#score1").val();
        let score2 = $("#score2").val();
        let link = $("#link").val();
        let bracket = $("#bracket").val();
        let date = $("#date").val();
        let location = $("#location").val();
        let comm1 = $("#commName1").val();
        let commTwit1 = $("#commTwitter1").val();
        let comm2 = $("#commName2").val();
        let commTwit2 = $("#commTwitter2").val();
        socket.emit('update', {
            gameInfo: {
                player1: player1,
                player2: player2,
                score1: score1,
                score2: score2,
                bracket: bracket,
                link: link,
                date: date,
                location: location
            },
            commInfo: {
                commName1: comm1,
                commTwitter1: commTwit1,
                commName2: comm2,
                commTwitter2: commTwit2
            }, doubles: {
                enabled: doubles,
                content: {
                    player3: player3,
                    player4: player4
                }
            }, teams: {
                team1: team1,
                team2: team2
            }, rankings: {
                lastRankings: lastRankings
            }
        });
        return false;
    });
});

function setContent(obj) {
    let keys = Object.keys(obj);
    keys.forEach((key) => {
        let value = obj[key];
        let currentVal = $(`#${key}`).val();
        if (currentVal !== value) {
            $(`#${key}`).val(value);
        }
    });
}

function doSwapNames(type) {
    if (type === "info") {
        swap("player1", "player2");
        swap("player3", "player4");
        swap("score1", "score2");
    } else {
        swap("commName1", "commName2");
        swap("commTwitter1", "commTwitter1");
    }
}

function swap(id1, id2) {
    let value1 = $(`#${id1}`).val();
    let value2 = $(`#${id2}`).val();
    $(`#${id1}`).val(value2);
    $(`#${id2}`).val(value1);
}

function getTournamentInfo() {
    $("#results").addClass("hide");
    $("#players").empty();
    $("#event-options").empty();
    $("#select").attr("disabled", true);
    let tournamentSlug = $('#tournamentName').val();
    $("#message").text("");
    fetch(`http://localhost:3000/tournament?name=${tournamentSlug}`).then((response) => {
        return response.json();
    }).then((data) => {
        if (data.status == "success") {
            let eventSelect = $("#event-options");
            eventSelect.empty();
            let tourneyName = data.name;
            tournamentId = data.id;
            let events = data.events;
            events.forEach((event) => {
                eventSelect.append($(`<option value='${event.id}'>${event.name}</option>`));
            });
        } else {
            $("#message").text("No tournament with that identifier found! Please double check that the url is correct!");
        }
        $("#results").removeClass("hide");
    });
}

function eventSet() {
    $("#select").attr("disabled", true);
    let eventId = $("#event-options").val();
    let url = `http://localhost:3000/queue?id=${eventId}&tournament=${tournamentId}`;
    fetch(url).then((response) => {
        return response.json();
    }).then((data) => {
        $("#message").text("");
        $("#players").html("");
        if (data.status == "success") {
            if (data.players.length > 0) {
                players = data.players.map((player, i) => {
                    $("#players").append(`<p><strong>Player ${i + 1}</strong>: ${player.gameName}</p>`);
                    return player.gameName;
                });
                phase = data.phase;
                let button = $("#select");
                button.on("click", setScoreboard);
                button.attr("disabled", false);
            } else {
                $("#select").attr("disabled", true);
                $("#message").text("No matches queued for stream, or the tournament is done.");
            }

        } else {
            $("#select").attr("disabled", true);
            $("#message").text("None found!");
        }
    });
}

function set(target) {
    let value = $(target).text();
    $("#duplicates").empty();
    $("#player-name").val(value);
    $("#player-table").empty();
    getResults();
}

function setScoreboard() {
    players.forEach((element, i) => {
        $(`#player${i + 1}`).val(element);
    });
    $('#bracket').val(phase);
}

function show(type) {
    if (type === "doubles") {
        doubles = !doubles;
        $(".doubles").toggle();
    } else {
        console.log("eneter");
        $(".teams").toggle();
    }
}

function showBracket() {
    let fullUrl = `https://challonge.com/${$("#bracketLink").val()}/module`;
    $("#bracket-page").attr("src", fullUrl);
    $("#bracket-page").height("500px");
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var src = document.getElementById(ev.dataTransfer.getData("text"));
    var tgt = ev.currentTarget;
    let temp = ev.target.value;
    ev.target.value = src.value;
    src.value = temp;
}

function getResults() {
    $("#player-message").empty();
    let playerName = $("#player-name").val();
    let game = $("#game").val();
    let url = `http://localhost:3000/smasher?name=${playerName}&game=${game}`;
    fetch(url).then((response) => {
        return response.json();
    }).then((data) => {
        if (data.type == "duplicate") {
            let duplicatePlayers = data.data;
            duplicatePlayers.forEach((player) => {
                $("#duplicates").append(`<button class='btn btn-primary' onclick='set(this)'>${player}</button>`);
            });
        } else if (data.type == "empty") {
            $("#player-message").text(data.message);
        } else {
            let placings = data.data;
            let rows = placings.rows;
            placings.rows = rows.slice(rows.length - 10);
            createResults(placings);
        }
    });
}

function createLocalLink() {
    fetch(`http://localhost:3000/address`).then((response) => {
        return response.json();
    }).then((data) => {
        let link = `http://${data.address}:${data.port}`;
        let toCopy = $(`<input id="copy" value="${link}">`);
        $("#address-area").append(toCopy);
    });
}

function createResults(results) {
    let headers = results.headers;
    let rows = results.rows;
    lastRankings = results;
    let table = $("#player-table");
    table.empty();
    let head = $("<tr>");
    headers.forEach((item) => {
        head.append($(`<th>${item}</th>`));
    });
    let body = $("<tbody>");
    rows.forEach((row) => {
        let singleRow = $("<tr>");
        row.forEach((item) => {
            singleRow.append($(`<td>${item}</td>`));
        });
        body.append(singleRow);
    });
    table.append(head);
    table.append(body);
}

function confirmMatch() {
    let player1 = $("#player1").val();
    let player2 = $("#player2").val();
    let player3 = $("#player3").val();
    let player4 = $("#player4").val();
    let bracket = $("#bracket").val();
    let data = {
        match: {
            player1: player1,
            player2: player2,
            player3: player3,
            player4: player4,
            bracket: bracket,
            doubles: doubles
        }
    }
    fetch("http://localhost:3000/match", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
}

function setChat() {
    let link = $("#stream-value").val();
    let fullLink = `https://www.twitch.tv/embed/${link}/chat`;
    let iframe = $('#chat-src');
    iframe.height("500px");
    iframe.attr("src", fullLink);
}