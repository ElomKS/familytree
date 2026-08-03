const avatarColors = [
  "bg-[#C1584C]", "bg-[#C79A56]", "bg-[#6B9A78]",
  "bg-[#5A7FB5]", "bg-[#8B6BAF]", "bg-[#B5854A]",
];

export function fullName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function normalizeName(name) {
  return name.replace(/\s+/g, " ").trim().toLowerCase();
}

export function initialsOf(first, last) {
  return `${(first || "")[0] || ""}${(last || "")[0] || ""}`.toUpperCase() || "?";
}

export function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function formatDates(birthDate, deathDate, deceased) {
  const b = birthDate ? birthDate.slice(0, 4) : "";
  const d = deathDate ? deathDate.slice(0, 4) : "";
  if (b && d) return `${b} – ${d}`;
  if (b) return `né(e) ${b}`;
  if (d) return `† ${d}`;
  if (deceased) return "Décédé(e)";
  return "";
}

export function genderLabel(gender) {
  if (gender === "homme") return "Homme";
  if (gender === "femme") return "Femme";
  if (gender) return "Autre";
  return "";
}
