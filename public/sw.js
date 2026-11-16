importScripts("/scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

// Domains allowed for top-level page/iframe loads
const ALLOWED_HOSTS = [
	"krillion.io",
	"www.krillion.io",
	"challenges.cloudflare.com" // Required for "Host a Room" verification iframe
];

async function handleRequest(event) {
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		// Check if the user is trying to load a webpage or iframe
		const isPageLoad =
			event.request.mode === "navigate" ||
			event.request.destination === "document" ||
			event.request.destination === "iframe";

		if (isPageLoad) {
			const rawUrl = decodeURIComponent(event.request.url);
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
