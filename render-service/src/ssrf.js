import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

// Mirrors fetcher.ValidateURL / isBlockedIP in the Go API: only public
// http(s) URLs. A headless browser makes many requests the API never sees
// (subresources, redirects, fetch() from page scripts), so every one of
// them goes through here — see the route handler in render.js.

const blocked = new BlockList();
// IPv4
blocked.addSubnet("0.0.0.0", 8, "ipv4"); // "this network", incl. unspecified
blocked.addSubnet("10.0.0.0", 8, "ipv4");
blocked.addSubnet("100.64.0.0", 10, "ipv4"); // carrier-grade NAT
blocked.addSubnet("127.0.0.0", 8, "ipv4");
blocked.addSubnet("169.254.0.0", 16, "ipv4"); // link-local, cloud metadata
blocked.addSubnet("172.16.0.0", 12, "ipv4");
blocked.addSubnet("192.168.0.0", 16, "ipv4");
blocked.addSubnet("224.0.0.0", 4, "ipv4"); // multicast
blocked.addAddress("255.255.255.255", "ipv4");
// IPv6
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
blocked.addSubnet("fc00::", 7, "ipv6"); // unique local
blocked.addSubnet("fe80::", 10, "ipv6"); // link-local
blocked.addSubnet("ff00::", 8, "ipv6"); // multicast

export class BlockedURLError extends Error {}

export function isBlockedIP(address) {
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) {
    // IPv4-mapped (::ffff:10.0.0.1) must be judged as the IPv4 it wraps.
    const mapped = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blocked.check(mapped[1], "ipv4");
    return blocked.check(address, "ipv6");
  }
  return true; // not an IP at all — refuse rather than guess
}

// assertPublicURL throws BlockedURLError unless rawURL is http(s) and every
// address its host resolves to is public.
export async function assertPublicURL(rawURL) {
  let url;
  try {
    url = new URL(rawURL);
  } catch {
    throw new BlockedURLError("invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BlockedURLError("only http and https URLs are allowed");
  }

  // URL keeps IPv6 literals bracketed; dns.lookup wants them bare.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BlockedURLError("could not resolve host");
  }
  if (addresses.length === 0 || addresses.some((a) => isBlockedIP(a.address))) {
    throw new BlockedURLError("URL resolves to a private or reserved address");
  }
  return url;
}
