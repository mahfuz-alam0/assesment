// Prints seed SQL to stdout: `tsx scripts/seed.ts > scripts/seed.sql`
import { hashPassword } from "../src/lib/password";

const PASSWORD = "Dealer#2026"; // synthetic, same for every seeded user

const dealerships = [
  { id: 1, slug: "alpha", name: "Alpha Motors" },
  { id: 2, slug: "beta", name: "Beta Autos" },
];

const users: [string, string][] = [
  ["admin1", "admin"],
  ["admin2", "admin"],
  ["viewer", "viewer"],
];

const cars: [string, string, number, string][] = [
  ["Toyota", "Corolla", 2022, "available"],
  ["Honda", "Civic", 2021, "reserved"],
  ["Ford", "Focus", 2020, "sold"],
  ["Mazda", "CX-5", 2023, "available"],
];

function quote(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

const passwordHash = await hashPassword(PASSWORD);
const sql: string[] = [
  "DELETE FROM sessions;",
  "DELETE FROM vehicles;",
  "DELETE FROM users;",
  "DELETE FROM dealerships;",
];

let userId = 1;
let vehicleId = 1;

for (const dealership of dealerships) {
  sql.push(`INSERT INTO dealerships (id, name) VALUES (${dealership.id}, ${quote(dealership.name)});`);

  for (const [name, role] of users) {
    const email = `${name}@${dealership.slug}.test`;
    sql.push(
      `INSERT INTO users (id, email, password_hash, role, dealership_id) VALUES (${userId++}, ${quote(email)}, ${quote(passwordHash)}, ${quote(role)}, ${dealership.id});`,
    );
  }

  for (const [make, model, year, status] of cars) {
    sql.push(
      `INSERT INTO vehicles (id, dealership_id, make, model, year, status) VALUES (${vehicleId++}, ${dealership.id}, ${quote(make)}, ${quote(model)}, ${year}, ${quote(status)});`,
    );
  }
}

console.log(sql.join("\n"));
