import assert from "node:assert/strict";
import test from "node:test";
import { parseNoticeId, validateNotice } from "./validate.js";

test("accepts a trimmed notice", () => {
  const result = validateNotice({ title: "  Lab  ", body: "  Room 204  " });
  assert.deepEqual(result, { value: { title: "Lab", body: "Room 204" } });
});

test("rejects an empty title", () => {
  const result = validateNotice({ title: "   ", body: "hello" });
  assert.equal(result.error, "Title is required");
});

test("rejects an empty message", () => {
  const result = validateNotice({ title: "hello", body: "" });
  assert.equal(result.error, "Message is required");
});

test("rejects a title that is too long", () => {
  const result = validateNotice({ title: "a".repeat(81), body: "ok" });
  assert.match(result.error, /80 characters/);
});

test("parses a positive integer id", () => {
  assert.equal(parseNoticeId("12"), 12);
  assert.equal(parseNoticeId("0"), null);
  assert.equal(parseNoticeId("1a"), null);
  assert.equal(parseNoticeId("-3"), null);
});
