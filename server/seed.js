const pool = require("./db");

const seedUsers = [
  { record_no: "0001", first_name: "Jorge", last_name: "Martinez", phone_number: "+33 6 12 34 56 78", profession: "Ingénieur structure", request: "Nécessite l'accès aux fichiers de projet archivés.", created_at: "2026-06-02" },
  { record_no: "0002", first_name: "Anya", last_name: "Kapoor", phone_number: "+33 6 98 76 54 32", profession: "Designer produit", request: "", created_at: "2026-06-14" },
  { record_no: "0003", first_name: "Lily", last_name: "Chen", phone_number: "+33 7 11 22 33 44", profession: "Analyste de données", request: "Souhaite une présentation du tableau de bord de reporting.", created_at: "2026-06-20" },
];

async function seed() {
  try {
    await pool.query("DELETE FROM users");
    for (const u of seedUsers) {
      await pool.query(
        `INSERT INTO users (record_no, first_name, last_name, phone_number, profession, request, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [u.record_no, u.first_name, u.last_name, u.phone_number, u.profession, u.request, u.created_at]
      );
    }
    console.log("Seeded 3 users into the database.");
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    await pool.end();
  }
}

seed();
