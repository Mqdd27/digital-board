import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pg is a server-only driver; keep it out of the bundler.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
