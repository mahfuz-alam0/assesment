import type { User } from "../types";
import { request } from "./http";

export function login(email: string, password: string) {
  return request("/api/login", { method: "POST", body: { email, password } });
}

export function logout() {
  return request("/api/logout", { method: "POST" });
}

export function getMe() {
  return request<User>("/api/me");
}
