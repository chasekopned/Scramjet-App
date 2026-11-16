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

	// 1. Block ad scripts cleanly
	if (reqUrl.includes("scripts.mediavine.com") || reqUrl.includes("googlesyndication")) {
		return new Response(null, { status: 204 });
	}

	if (scramjet.route(event)) {
		// 2. Enforce Krillion-only navigation lock
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

		// 3. Intercept Turnstile scripts and fix Scramjet's "[object Object]" syntax corruption
		const res = await scramjet.fetch(event);

		if (decodeURIComponent(reqUrl).includes("challenges.cloudflare.com")) {
			const contentType = res.headers.get("content-type") || "";
			if (contentType.includes("javascript") || contentType.includes("html")) {
				let text = await res.text();
				// Fix Scramjet AST bug where an object is stringified as [object Object] inside JS
				text = text.replace(/\[object Object\]/g, "{}");
				return new Response(text, {
					status: res.status,
					statusText: res.statusText,
					headers: res.headers
				});
			}
		}

		return res;
	}

	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
