export const ENV = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  isProduction: process.env.NODE_ENV === "production",
};
