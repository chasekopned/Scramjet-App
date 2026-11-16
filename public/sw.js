importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

const ALLOWED_HOSTS = [
	"krillion.io",
	"www.krillion.io",
	"challenges.cloudflare.com"
];

async function handleRequest(event) {
	await scramjet.loadConfig();

	const reqUrl = event.request.url;

	// 1. Fix Cloudflare Turnstile blob: and data: Web Workers
	// Scramjet rewrites in-memory blob: URLs into /scramjet/blob:..., which fails if sent to the server.
	if (reqUrl.includes("/scramjet/blob:") || reqUrl.includes("/scram/blob:")) {
		const blobIndex = reqUrl.indexOf("blob:");
		const rawBlobUrl = decodeURIComponent(reqUrl.slice(blobIndex).split("?")[0]);
		return fetch(rawBlobUrl);
	}

	// 2. Optional: Silence the console JSON errors by blocking third-party ad scripts
	if (reqUrl.includes("scripts.mediavine.com") || reqUrl.includes("googlesyndication")) {
		return new Response("", { status: 204 });
	}

	if (scramjet.route(event)) {
		// 3. Enforce the Krillion-only navigation lock
		const isPageLoad =
			event.request.mode === "navigate" ||
			event.request.destination === "document" ||
			event.request.destination === "iframe";

		if (isPageLoad) {
			const rawUrl = decodeURIComponent(reqUrl);
			const isAllowed = ALLOWED_HOSTS.some((domain) => rawUrl.includes(domain));

			if (!isAllowed) {
				return new Response("Access Denied: This proxy is locked to Krillion.io.", {
					status: 403,
					headers: { "Content-Type": "text/plain" },
				});
			}
		}

		return scramjet.fetch(event);
	}

	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
