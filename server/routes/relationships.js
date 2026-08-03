const express = require("express");
const pool = require("../db");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

function formatRelationship(row) {
  return {
    id: row.id,
    personId: row.person_id,
    relatedPersonId: row.related_person_id,
    relationshipType: row.relationship_type,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString().slice(0, 10)
      : String(row.created_at).slice(0, 10),
  };
}

// GET all relationships
router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM relationships ORDER BY created_at DESC");
    res.json(rows.map(formatRelationship));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch relationships" });
  }
});

// GET all relationships involving a specific person (either direction)
router.get("/person/:personId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM relationships WHERE person_id = $1 OR related_person_id = $1",
      [req.params.personId]
    );
    res.json(rows.map(formatRelationship));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch relationships" });
  }
});

// CREATE a relationship
router.post("/", async (req, res) => {
  const { personId, relatedPersonId, relationshipType } = req.body;
  if (!["parent", "spouse"].includes(relationshipType)) {
    return res.status(400).json({ error: "relationshipType must be 'parent' or 'spouse'" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO relationships (person_id, related_person_id, relationship_type)
       VALUES ($1, $2, $3) RETURNING *`,
      [personId, relatedPersonId, relationshipType]
    );
    res.status(201).json(formatRelationship(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create relationship" });
  }
});

// DELETE a relationship
router.delete("/:id", async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM relationships WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Relationship not found" });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete relationship" });
  }
});

module.exports = router;
