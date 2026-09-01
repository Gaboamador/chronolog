import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { assertFirebaseEnvironment } from "./scripts/firebaseEnvironment.mjs";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  assertFirebaseEnvironment({
    command,
    mode,
    lifecycleEvent: process.env.npm_lifecycle_event,
    env,
  });

  return {
    plugins: [react()],
    base: "/chronolog/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
