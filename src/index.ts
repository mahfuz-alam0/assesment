import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { health } from "./routes/health";
import { vehicleRoutes } from "./routes/vehicles";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.route("/api/health", health);
app.route("/api", authRoutes); // /login /logout /me
app.route("/api/vehicles", vehicleRoutes);

export default app;
