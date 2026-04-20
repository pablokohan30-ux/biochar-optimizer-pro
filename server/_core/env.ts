const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without it."
  );
}

export const ENV = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  jwtSecret: isProduction
    ? process.env.JWT_SECRET!
    : (process.env.JWT_SECRET ?? "dev-secret-change-in-production"),
  isProduction,
};
