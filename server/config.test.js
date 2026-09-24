const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("config fails fast when JWT_SECRET is missing", () => {
  const result = spawnSync(process.execPath, [path.join(__dirname, "config.js")], {
    env: { ...process.env, JWT_SECRET: "" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr.toString(), /JWT_SECRET is not defined/);
});