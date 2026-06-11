export async function register() {
  // Only run in Node.js runtime (not Edge), server-side only
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./lib/db/run-migrations");
    await runMigrations();
  }
}
