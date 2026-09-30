import { test } from "node:test";
import assert from "node:assert/strict";
import { assertPublicURL, BlockedURLError, isBlockedIP } from "../src/ssrf.js";

test("isBlockedIP blocks private, loopback, link-local and mapped addresses", () => {
  for (const ip of [
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254",
    "0.0.0.0", "100.64.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1",
  ]) {
    assert.equal(isBlockedIP(ip), true, ip);
  }
});

test("isBlockedIP allows public addresses", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isBlockedIP(ip), false, ip);
  }
});

test("assertPublicURL rejects non-http schemes and private hosts", async () => {
  for (const url of [
    "file:///etc/passwd", "ftp://example.com", "http://localhost:9721/",
    "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data",
    "not a url",
  ]) {
    await assert.rejects(assertPublicURL(url), BlockedURLError, url);
  }
});

test("assertPublicURL accepts a public IP literal", async () => {
  await assertPublicURL("http://8.8.8.8/");
});
