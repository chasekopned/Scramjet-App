"use strict";
const frame = document.getElementById("sj-frame");
const errorText = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

const TARGET_URL = "https://krillion.io/";

const { ScramjetController } = $scramjetLoadController();
const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
});

async function bootKrillion() {
	try {
		await scramjet.init();
		await registerSW();
		await navigator.serviceWorker.ready;

		const wispUrl =
			(location.protocol === "https:" ? "wss" : "ws") +
			"://" +
			location.host +
			"/wisp/";

		await connection.setTransport("/libcurl/index.mjs", [
			{ websocket: wispUrl },
		]);

		// Give BareMux 500ms to finish loading libcurl WASM before booting the iframe
		await new Promise((resolve) => setTimeout(resolve, 500));

		frame.style.display = "block";
		frame.style.position = "fixed";
		frame.style.top = "0";
		frame.style.left = "0";
		frame.style.width = "100vw";
		frame.style.height = "100vh";
		frame.style.border = "none";
		frame.style.zIndex = "9999";

		frame.src = scramjet.encodeUrl(TARGET_URL);
	} catch (err) {
		console.error("Failed to initialize Scramjet:", err);
		if (errorText) errorText.textContent = "Error booting proxy:";
		if (errorCode) errorCode.textContent = err.message || String(err);
	}
}

bootKrillion();
