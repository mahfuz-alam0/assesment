import { Hono } from "hono";
import { z } from "zod";
import { STATUSES } from "../../web/src/types";
import { findVehicle, listVehicles, updateVehicle } from "../db/vehicles";
import { fieldErrors } from "../lib/validation";
import { auth, requireAdmin } from "../middleware/auth";
import type { AppEnv } from "../types";

// A function, not a const: Workers freeze Date at 1970 in module scope, so the year bound must be computed per request.
const vehicleUpdateSchema = () =>
  z.object({
    make: z.string("Required").trim().min(1, "Required"),
    model: z.string("Required").trim().min(1, "Required"),
    year: z
      .number("Must be a number")
      .int("Must be a whole number")
      .min(1900, "Must be 1900 or later")
      .max(new Date().getFullYear() + 1, "Too far in the future"),
    status: z.enum(STATUSES, "Invalid status"),
    version: z.number("Required").int().min(1),
  });

// `:id{[0-9]+}`: non-numeric ids never reach the handlers (plain 404)
export const vehicleRoutes = new Hono<AppEnv>();

vehicleRoutes.use(auth);

vehicleRoutes.get("/", async (c) => {
  const vehicles = await listVehicles(c.env.DB, c.get("session").dealershipId);
  return c.json(vehicles);
});

vehicleRoutes.get("/:id{[0-9]+}", async (c) => {
  const id = Number(c.req.param("id"));
  const vehicle = await findVehicle(c.env.DB, id, c.get("session").dealershipId);
  return vehicle ? c.json(vehicle) : c.json({ error: "Vehicle not found." }, 404);
});

vehicleRoutes.put("/:id{[0-9]+}", requireAdmin, async (c) => {
  const body = vehicleUpdateSchema().safeParse(await c.req.json().catch(() => null));
  if (!body.success) {
    return c.json({ error: "Invalid vehicle data.", fields: fieldErrors(body.error) }, 400);
  }

  const { version, ...edit } = body.data;
  const id = Number(c.req.param("id"));
  const { dealershipId } = c.get("session");

  const updated = await updateVehicle(c.env.DB, id, dealershipId, version, edit);
  if (updated) {
    return c.json(updated);
  }

  const current = await findVehicle(c.env.DB, id, dealershipId);
  if (current) {
    return c.json({ error: "This vehicle was updated by someone else. Refresh and try again.", current }, 409);
  }
  return c.json({ error: "Vehicle not found." }, 404);
});
