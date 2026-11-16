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

	// 1. Fix 204 null-body crash when blocking ad scripts
	if (reqUrl.includes("scripts.mediavine.com") || reqUrl.includes("googlesyndication")) {
		return new Response(null, { status: 204 });
	}

	// 2. Fix Cloudflare Turnstile blob: worker origin mismatch
	if (reqUrl.includes("/scramjet/blob:") || reqUrl.includes("/scram/blob:")) {
		try {
			const blobIndex = reqUrl.indexOf("blob:");
			const decodedBlob = decodeURIComponent(reqUrl.slice(blobIndex).split("?")[0]);
			// Extract the UUID at the end of blob:https://challenges.cloudflare.com/<uuid>
			// and map it back to the real browser memory origin (self.location.origin)
			const uuid = decodedBlob.split("/").pop();
			const realBlobUrl = `blob:${self.location.origin}/${uuid}`;
			return await fetch(realBlobUrl);
		} catch (err) {
			// Fallback to Scramjet's internal handler if direct blob fetch fails
			return scramjet.fetch(event);
		}
	}

	if (scramjet.route(event)) {
		// 3. Enforce Krillion-only navigation lock
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
