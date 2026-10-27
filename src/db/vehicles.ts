import type { Vehicle } from "../../web/src/types";

const COLUMNS = "id, make, model, year, status, version";

// every query is scoped by dealership_id
export async function listVehicles(db: D1Database, dealershipId: number) {
  const { results } = await db
    .prepare(`SELECT ${COLUMNS} FROM vehicles WHERE dealership_id = ? ORDER BY id`)
    .bind(dealershipId)
    .all<Vehicle>();
  return results;
}

export async function findVehicle(db: D1Database, id: number, dealershipId: number) {
  return db
    .prepare(`SELECT ${COLUMNS} FROM vehicles WHERE id = ? AND dealership_id = ?`)
    .bind(id, dealershipId)
    .first<Vehicle>();
}

// One conditional UPDATE: version check + write are a single atomic statement, so two editors holding
// the same version can't both win. No read-then-write. Resolves null when nothing matched.
export async function updateVehicle(
  db: D1Database,
  id: number,
  dealershipId: number,
  version: number,
  edit: Pick<Vehicle, "make" | "model" | "year" | "status">,
) {
  const { make, model, year, status } = edit;

  return db
    .prepare(
      `UPDATE vehicles SET make = ?, model = ?, year = ?, status = ?, version = version + 1
       WHERE id = ? AND dealership_id = ? AND version = ?
       RETURNING ${COLUMNS}`,
    )
    .bind(make, model, year, status, id, dealershipId, version)
    .first<Vehicle>();
}
