"use strict";
const frame = document.getElementById("sj-frame");
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

scramjet.init();

async function bootKrillion() {
  try {
    await registerSW();

    const wispUrl =
      (location.protocol === "https:" ? "wss" : "ws") +
      "://" +
      location.host +
      "/wisp/";

    // Use epoxy-transport instead of libcurl so it works on iPad (WebKit)
    if ((await connection.getTransport()) !== "/epoxy/index.mjs") {
      await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
    }

    // Make the fullscreen game iframe visible and load Krillion directly
    frame.style.display = "block";
    frame.style.position = "fixed";
    frame.style.top = "0";
    frame.style.left = "0";
    frame.style.width = "100vw";
    frame.style.height = "100vh";
    frame.style.border = "none";

    frame.src = scramjet.encodeUrl(TARGET_URL);
  } catch (err) {
    console.error("Failed to initialize Scramjet:", err);
  }
}

window.addEventListener("load", bootKrillion);
