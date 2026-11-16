export default {
  transpilePackages: ["@consumer-rights/contracts"],
  poweredByHeader: false,
  distDir: process.env.NEXT_DIST_DIR || ".next", // a second copy of the site (for testing) can use its own folder
  agentRules: false, // Next would otherwise rewrite web/AGENTS.md on every start
  // The API is reached through the site's own address, so the session cookie is first-party and never readable by scripts.
  async rewrites() {
    const api = process.env.API_INTERNAL_URL || "http://127.0.0.1:4300";
    return [{ source: "/api/:path*", destination: `${api}/api/:path*` }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=(), usb=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
      ]
    }];
  }
};
