const express = require("express");
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

function formatPerson(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthDate: row.birth_date,
    deathDate: row.death_date,
    deceased: !!row.deceased || !!row.death_date,
    gender: row.gender,
    photoUrl: row.photo_url,
    notes: row.notes || "",
    userId: row.user_id,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10),
  };
}

// GET all people
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM people ORDER BY created_at DESC");
    res.json(rows.map(formatPerson));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

// GET one person
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM people WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Person not found" });
    res.json(formatPerson(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch person" });
  }
});

// CREATE a person
router.post("/", async (req, res) => {
  const { firstName, lastName, birthDate, deathDate, deceased, gender, photoUrl, notes, userId } = req.body;
  const f = String(firstName || "").trim();
  const l = String(lastName || "").trim();
  try {
    const { rows } = await pool.query(
      `INSERT INTO people (first_name, last_name, birth_date, death_date, deceased, gender, photo_url, notes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [f, l || null, birthDate || null, deathDate || null, !!deceased, gender || null, photoUrl || null, notes || "", userId || null]
    );
    res.status(201).json(formatPerson(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create person" });
  }
});

// UPDATE a person
router.put("/:id", async (req, res) => {
  const { firstName, lastName, birthDate, deathDate, deceased, gender, photoUrl, notes, userId } = req.body;
  const f = String(firstName || "").trim();
  const l = String(lastName || "").trim();
  try {
    const { rows } = await pool.query(
      `UPDATE people SET first_name = $1, last_name = $2, birth_date = $3, death_date = $4,
       deceased = $5, gender = $6, photo_url = $7, notes = $8, user_id = $9
       WHERE id = $10 RETURNING *`,
      [f, l || null, birthDate || null, deathDate || null, !!deceased, gender || null, photoUrl || null, notes || "", userId || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Person not found" });
    res.json(formatPerson(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update person" });
  }
});

// DELETE a person
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM people WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Person not found" });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete person" });
  }
});

module.exports = router;
