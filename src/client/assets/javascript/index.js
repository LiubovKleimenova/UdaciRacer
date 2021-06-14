let store = {
	track_id: undefined,
	player_id: undefined,
	race_id: undefined,
};

document.addEventListener("DOMContentLoaded", function () {
	onPageLoad();
	setupClickHandlers();
});

async function onPageLoad() {
	try {
		getTracks().then((tracks) => {
			const html = renderTrackCards(tracks);
			renderAt("#tracks", html);
		});

		getRacers().then((racers) => {
			const html = renderRacerCars(racers);
			renderAt("#racers", html);
		});
	} catch (err) {
		console.log("Problem getting tracks and racers ::", err.message);
	}
}

function setupClickHandlers() {
	document.addEventListener(
		"click",
		function (event) {
			const { target } = event;

			// Race track form field
			if (
				target.matches(".card.track") ||
				target.parentElement.matches(".card.track")
			) {
				handleSelectTrack(target);
			}

			// Podracer form field
			if (
				target.matches(".card.podracer") ||
				target.parentElement.matches(".card.podracer")
			) {
				handleSelectPodRacer(target);
			}

			// Submit create race form
			if (target.matches("#submit-create-race")) {
				event.preventDefault();

				// start race
				handleCreateRace();
			}

			// Handle acceleration click
			if (target.matches("#gas-peddle")) {
				handleAccelerate(target);
			}
		},
		false
	);
}

async function delay(ms) {
	try {
		return await new Promise((resolve) => setTimeout(resolve, ms));
	} catch (err) {
		console.log(err.message);
	}
}
// ^ PROVIDED CODE ^ DO NOT REMOVE

// This async function controls the flow of the race, add the logic and err handling
async function handleCreateRace() {
	const track_id = store.track_id;
	const player_id = store.player_id;

	if (!track_id || !player_id) {
		alert(`Please select both track and racer first`);
		return;
	}

	try {
		const race = await createRace(player_id, track_id);
		renderAt("#race", renderRaceStartView(race.Track, race.Cars));
		store.race_id = race.ID;
	} catch (err) {
		console.log(err.message);
		return;
	}

	await runCountdown();

	await startRace(store.race_id - 1);

	await runRace(store.race_id - 1);
}

function runRace(raceID) {
	return new Promise((resolve) => {
		const raceInterval = setInterval(async () => {
			try {
				let res = await getRace(raceID);
				console.log(res);
				if (res.status === "in-progress") {
					renderAt("#leaderBoard", raceProgress(res.positions));
				}
				if (res.status === "finished") {
					clearInterval(raceInterval);
					renderAt("#race", resultsView(res.positions));
					resolve(res);
				}
			} catch (err) {
				console.log(err.message);
			}
		}, 500);
	});
}

async function runCountdown() {
	try {
		// wait for the DOM to load
		await delay(1000);
		let timer = 3;

		return new Promise((resolve) => {
			let countDown = setInterval(() => {
				timer--;
				document.getElementById("big-numbers").innerHTML = timer;
				if (!timer) {
					clearInterval(countDown);
					resolve();
				}
			}, 1000);
		});
	} catch (err) {
		console.log(err.message);
	}
}

function handleSelectPodRacer(target) {
	if (!target.classList.contains("podracer")) {
		target = target.parentElement;
	}

	// remove class selected from all racer options
	const selected = document.querySelector("#racers .selected");
	if (selected) {
		selected.classList.remove("selected");
	}

	// add class selected to current target
	target.classList.add("selected");

	store.player_id = parseInt(target.id);
}

function handleSelectTrack(target) {
	if (!target.classList.contains("track")) {
		target = target.parentElement;
	}

	// remove class selected from all track options
	const selected = document.querySelector("#tracks .selected");
	if (selected) {
		selected.classList.remove("selected");
	}

	// add class selected to current target
	target.classList.add("selected");

	store.track_id = parseInt(target.id);
}

function handleAccelerate() {
	accelerate(store.race_id - 1).catch((err) => console.log(err.message));
}

// HTML VIEWS ------------------------------------------------
// Provided code - do not remove

function renderRacerCars(racers) {
	if (!racers.length) {
		return `
			<h4>Loading Racers...</4>
		`;
	}
	const results = racers.map(renderRacerCard).join("");

	return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
	const { id, driver_name, top_speed, acceleration, handling } = racer;

	return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>Top Speed: ${top_speed}</p>
			<p>Acceleration: ${acceleration}</p>
			<p>Handling: ${handling}</p>
		</li>
	`;
}

function renderTrackCards(tracks) {
	if (!tracks.length) {
		return `
			<h4>Loading Tracks...</4>
		`;
	}

	const results = tracks.map(renderTrackCard).join("");

	return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
	const { id, name } = track;

	return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`;
}

function renderCountdown(count) {
	return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track, racers) {
	return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function resultsView(positions) {
	positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));

	return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
	let userPlayer = positions.find((e) => e.id === store.player_id);
	userPlayer.driver_name += " (you)";

	positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
	let count = 0;

	const results = positions.map((p) => {
		count++;
		return `
			<div class="place${count}">
				<h3>${p.driver_name}</h3>
				<h2>${count}</h2>
			</div>
		`;
	}).join("");


	return `
		<main>
			<h3>Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`;
}

function renderAt(element, html) {
	const node = document.querySelector(element);

	node.innerHTML = html;
}

// ^ Provided code ^ do not remove

// API CALLS ------------------------------------------------

const SERVER = "http://localhost:8000";

function defaultFetchOpts() {
	return {
		mode: "cors",
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": SERVER,
		},
	};
}

function getTracks() {
	return fetch(`${SERVER}/api/tracks`)
		.then((res) => res.json())
		.catch((err) => console.log("Problem with getTracks request::", err.message));
}

function getRacers() {
	return fetch(`${SERVER}/api/cars`)
		.then((res) => res.json())
		.catch((err) =>
			console.log("Problem with getRacers request::", err.message)
		);
}

function createRace(player_id, track_id) {
	player_id = parseInt(player_id);
	track_id = parseInt(track_id);
	const body = { player_id, track_id };

	return fetch(`${SERVER}/api/races`, {
		method: "POST",
		...defaultFetchOpts(),
		dataType: "jsonp",
		body: JSON.stringify(body),
	})
		.then((res) => res.json())
		.catch((err) => console.log("Problem with createRace request::", err.message));
}

function getRace(id) {
	return fetch(`${SERVER}/api/races/${id}`, {
		method: "GET",
		...defaultFetchOpts(),
	})
		.then((res) => res.json())
		.catch((err) => console.log("Problem with getRace request::", err.message));
}

function startRace(id) {
	return fetch(`${SERVER}/api/races/${id}/start`, {
		method: "POST",
		...defaultFetchOpts(),
	}).catch((err) =>
		console.log("Problem with startRace request::", err.message)
	);
}

function accelerate(id) {
	return fetch(`${SERVER}/api/races/${id}/accelerate`, {
		method: "POST",
		...defaultFetchOpts(),
	}).catch((err) =>
		console.log("Problem with accelerate request::", err.message)
	);
}
