import type { Vehicle } from "../types";
import { request } from "./http";

export type VehicleEdit = Pick<Vehicle, "make" | "model" | "year" | "status"> & { version: number };

export function listVehicles() {
  return request<Vehicle[]>("/api/vehicles");
}

export function getVehicle(id: number) {
  return request<Vehicle>(`/api/vehicles/${id}`);
}

export function updateVehicle(id: number, edit: VehicleEdit) {
  return request<Vehicle>(`/api/vehicles/${id}`, { method: "PUT", body: edit });
}
