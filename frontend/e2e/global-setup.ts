import { execSync } from "child_process";
import path from "path";

export default async function globalSetup() {
  // Ensure demo seed exists so e2e can log in (idempotent).
  const backend = path.resolve(import.meta.dirname, "..", "..", "backend");
  execSync("python -m app.seed", { cwd: backend, stdio: "inherit" });
}
