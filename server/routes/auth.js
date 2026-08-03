const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "registre-secret-change-in-production";

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM auth_users WHERE username = $1", [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, username, role, created_at FROM auth_users ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/users", authenticate, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: "Nom d'utilisateur, mot de passe et rôle requis." });
  }
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "Rôle invalide." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO auth_users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at",
      [username, hash, role]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ce nom d'utilisateur existe déjà." });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.delete("/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM auth_users WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/password", authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Mot de passe actuel et nouveau mot de passe requis." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM auth_users WHERE id = $1", [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Mot de passe actuel incorrect." });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE auth_users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Mot de passe modifié." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.put("/users/:id/password", authenticate, requireAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: "Nouveau mot de passe requis." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères." });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const { rowCount } = await pool.query("UPDATE auth_users SET password_hash = $1 WHERE id = $2", [hash, req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    res.json({ message: "Mot de passe modifié." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
