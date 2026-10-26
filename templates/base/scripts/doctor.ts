import "dotenv/config";
import { loadEnvironment } from "../src/config/env.js";
import { features } from "../src/config/features.js";
// Importing configuration validates it but intentionally does not connect to providers.
try {
  const value = loadEnvironment(process.env);
  console.log("OK runtime settings validated; no credentials displayed.");
  console.log(
    `Database: ${features.database}; connection not checked. Run migrations against your development database.`,
  );
  __DOCTOR_PROVIDERS__
  console.log("This check did not send messages or verify inbox/device delivery.");
  void value;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Configuration invalid");
  process.exitCode = 1;
}
