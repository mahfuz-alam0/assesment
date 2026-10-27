export type Role = "admin" | "viewer";
export const STATUSES = ["available", "reserved", "sold"] as const;

export interface User {
  email: string;
  role: Role;
  dealership: string;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  status: (typeof STATUSES)[number];
  version: number;
}

export type Status = Vehicle["status"];
export type SortKey = "make" | "model" | "year" | "status" | "version";
export interface Sort {
  key: SortKey;
  dir: 1 | -1;
}
