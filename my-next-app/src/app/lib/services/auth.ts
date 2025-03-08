import { User, UserRole } from "../../models/types";

export async function login(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error("Login failed");
    return response.json();
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function logout(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    return response.ok;
  } catch (error) {
    console.error("Logout error:", error);
    return false;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/user");
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
