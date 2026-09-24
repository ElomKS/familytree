const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header && header.startsWith("Bearer ") ? header.split(" ")[1] : req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accès réservé aux administrateurs." });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
