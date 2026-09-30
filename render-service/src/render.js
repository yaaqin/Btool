import { chromium } from "playwright";
import { assertPublicURL, BlockedURLError } from "./ssrf.js";

// Budget for one render. The Go API waits render.Timeout (30s); staying
// under it means a slow page still comes back as a readable error.
const NAVIGATION_TIMEOUT_MS = 15_000;
const NETWORK_IDLE_TIMEOUT_MS = 8_000;
// Same cap as fetcher.MaxBodyBytes on the raw side.
const MAX_HTML_CHARS = 5 << 20;

// Nothing in these changes the DOM's metadata, and skipping them makes
// "network idle" arrive much sooner.
const SKIPPED_RESOURCE_TYPES = new Set(["image", "media", "font"]);

export class RenderError extends Error {}

let browserPromise = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({ args: ["--disable-dev-shm-usage"] })
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null;
        });
        return browser;
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close().catch(() => {});
}

// render loads url as userAgent in a fresh browser context, lets its
// JavaScript run until the network goes idle (or the budget runs out), and
// returns the serialized DOM.
export async function render(url, userAgent) {
  await assertPublicURL(url);

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent,
    // A service worker could answer requests without going through the
    // route handler below, bypassing the SSRF check.
    serviceWorkers: "block",
    acceptDownloads: false,
  });

  try {
    await context.routeWebSocket(/.*/, (ws) => ws.close());

    // Every request the page makes is re-validated, and fetched here with
    // redirects disabled: page.route only sees the first URL of a
    // redirect chain it lets the browser follow, so we hand the 3xx back
    // and the browser's follow-up request comes through here again.
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (SKIPPED_RESOURCE_TYPES.has(request.resourceType())) {
        return route.abort("blockedbyclient");
      }
      try {
        await assertPublicURL(request.url());
      } catch {
        return route.abort("blockedbyclient");
      }
      try {
        const response = await route.fetch({
          maxRedirects: 0,
          timeout: NAVIGATION_TIMEOUT_MS,
        });
        await route.fulfill({ response });
      } catch {
        await route.abort("failed").catch(() => {});
      }
    });

    const page = await context.newPage();
    let response;
    try {
      response = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
    } catch (err) {
      if (err.name === "TimeoutError") {
        throw new RenderError("timed out loading the page");
      }
      throw new RenderError("could not load the page");
    }
    if (!response) throw new RenderError("page returned no response");

    // Not every page ever goes idle (polling, analytics beacons) — take
    // whatever the DOM looks like once the budget is spent.
    await page
      .waitForLoadState("networkidle", { timeout: NETWORK_IDLE_TIMEOUT_MS })
      .catch(() => {});

    const html = await page.content();
    return {
      final_url: page.url(),
      status_code: response.status(),
      html: html.length > MAX_HTML_CHARS ? html.slice(0, MAX_HTML_CHARS) : html,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

export { BlockedURLError };
