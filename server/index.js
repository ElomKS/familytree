const express = require("express");
const path = require("path");
require("dotenv").config();
const pool = require("./db");
const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const peopleRouter = require("./routes/people");
const relationshipsRouter = require("./routes/relationships");

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "https://registrekfe.onrender.com",
].filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin) return next();
  const host = req.headers.host;
  const allowed =
    ALLOWED_ORIGINS.includes(origin) ||
    (host && (origin === `http://${host}` || origin === `https://${host}`));
  if (!allowed) return next(new Error("Not allowed by CORS"));
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: "2mb" }));

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_no VARCHAR(10) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    profession VARCHAR(150) NOT NULL,
    request TEXT DEFAULT '',
    created_at DATE DEFAULT CURRENT_DATE
  );
`;

const CREATE_AUTH_TABLE = `
  CREATE TABLE IF NOT EXISTS auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'staff')),
    created_at DATE DEFAULT CURRENT_DATE
  );
`;

const CREATE_PEOPLE_TABLE = `
  CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    birth_date DATE,
    death_date DATE,
    deceased BOOLEAN DEFAULT false,
    gender VARCHAR(20),
    photo_url TEXT,
    notes TEXT DEFAULT '',
    user_id UUID REFERENCES auth_users(id),
    created_at DATE DEFAULT CURRENT_DATE
  );
`;

const CREATE_RELATIONSHIPS_TABLE = `
  CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    related_person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    relationship_type VARCHAR(20) NOT NULL CHECK (relationship_type IN ('parent', 'spouse')),
    created_at DATE DEFAULT CURRENT_DATE,
    UNIQUE (person_id, related_person_id, relationship_type)
  );
`;

const SEED_USERS = [
  { record_no: "0001", first_name: "Jorge", last_name: "Martinez", phone_number: "+33 6 12 34 56 78", profession: "Ingénieur structure", request: "Nécessite l'accès aux fichiers de projet archivés.", created_at: "2026-06-02" },
  { record_no: "0002", first_name: "Anya", last_name: "Kapoor", phone_number: "+33 6 98 76 54 32", profession: "Designer produit", request: "", created_at: "2026-06-14" },
  { record_no: "0003", first_name: "Lily", last_name: "Chen", phone_number: "+33 7 11 22 33 44", profession: "Analyste de données", request: "Souhaite une présentation du tableau de bord de reporting.", created_at: "2026-06-20" },
];

async function initDB() {
  await pool.query(CREATE_TABLE);
  await pool.query(CREATE_AUTH_TABLE);
  await pool.query(CREATE_PEOPLE_TABLE);
  await pool.query("ALTER TABLE people ADD COLUMN IF NOT EXISTS deceased BOOLEAN DEFAULT false");
  await pool.query(CREATE_RELATIONSHIPS_TABLE);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (rows[0].count === 0) {
    for (const u of SEED_USERS) {
      await pool.query(
        `INSERT INTO users (record_no, first_name, last_name, phone_number, profession, request, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.record_no, u.first_name, u.last_name, u.phone_number, u.profession, u.request, u.created_at]
      );
    }
    console.log("Seeded initial users.");
  }

  const bcrypt = require("bcryptjs");
  const authCount = await pool.query("SELECT COUNT(*)::int AS count FROM auth_users");
  if (authCount.rows[0].count === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO auth_users (username, password_hash, role) VALUES ($1, $2, $3)",
      ["admin", hash, "admin"]
    );
    console.log("Seeded default admin account (admin / admin123).");
  }

  console.log("Database ready.");
}

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/people", peopleRouter);
app.use("/api/relationships", relationshipsRouter);

const clientBuild = path.join(__dirname, "..", "client", "build");
app.use(express.static(clientBuild));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientBuild, "index.html"));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
