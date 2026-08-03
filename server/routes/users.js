const express = require("express");
const pool = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

function formatUser(row) {
  return {
    id: row.id,
    recordNo: row.record_no,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    profession: row.profession,
    request: row.request || "",
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10),
  };
}

function nextRecordNo(rows) {
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.record_no, 10) || 0), 0);
  return String(max + 1).padStart(4, "0");
}

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    res.json(rows.map(formatUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.post("/", async (req, res) => {
  const { firstName, lastName, phoneNumber, profession, request } = req.body;
  try {
    const existing = await pool.query("SELECT * FROM users ORDER BY record_no DESC");
    const recordNo = nextRecordNo(existing.rows);
    const { rows } = await pool.query(
      `INSERT INTO users (record_no, first_name, last_name, phone_number, profession, request)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [recordNo, firstName, lastName, phoneNumber, profession, request || ""]
    );
    res.status(201).json(formatUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/:id", async (req, res) => {
  const { firstName, lastName, phoneNumber, profession, request } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone_number = $3, profession = $4, request = $5
       WHERE id = $6 RETURNING *`,
      [firstName, lastName, phoneNumber, profession, request || "", req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(formatUser(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
