const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "unit-test-secret";
const { authenticate, requireAdmin } = require("./auth");
const { JWT_SECRET } = require("../config");

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

test("authenticate rejects requests without a token", () => {
  const res = mockRes();
  let called = false;
  authenticate({ headers: {}, cookies: {} }, res, () => {
    called = true;
  });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test("authenticate rejects an invalid token", () => {
  const res = mockRes();
  let called = false;
  authenticate({ headers: { authorization: "Bearer not-a-token" }, cookies: {} }, res, () => {
    called = true;
  });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
});

test("authenticate accepts a valid Bearer token", () => {
  const token = jwt.sign({ username: "admin", role: "admin" }, JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
  const res = mockRes();
  let called = false;
  authenticate(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.user.role, "admin");
});

test("authenticate accepts a token from the httpOnly cookie", () => {
  const token = jwt.sign({ username: "staff", role: "staff" }, JWT_SECRET);
  const req = { headers: {}, cookies: { token } };
  const res = mockRes();
  let called = false;
  authenticate(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.user.username, "staff");
});

test("requireAdmin lets admins through and blocks staff", () => {
  let adminCalled = false;
  requireAdmin({ user: { role: "admin" } }, {}, () => {
    adminCalled = true;
  });
  assert.equal(adminCalled, true);

  const res = mockRes();
  let staffCalled = false;
  requireAdmin({ user: { role: "staff" } }, res, () => {
    staffCalled = true;
  });
  assert.equal(staffCalled, false);
  assert.equal(res.statusCode, 403);
});

test("authenticate rejects an expired token", () => {
  const token = jwt.sign({ username: "admin", role: "admin" }, JWT_SECRET, { expiresIn: "-1s" });
  const res = mockRes();
  let called = false;
  authenticate({ headers: { authorization: `Bearer ${token}` }, cookies: {} }, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});