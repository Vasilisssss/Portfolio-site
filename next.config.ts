import type { NextConfig } from "next";

/**
 * Two targets:
 * - default (`npm run build`): Node/Vercel server with security headers.
 * - static export (`npm run build:pages`): GitHub Pages under /<repo>, set via PAGES_BASE_PATH.
 */
const isPages = process.env.STATIC_EXPORT === "1";
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath, // the journey loads its frames and scenes from <basePath>/media and <basePath>/scenes
    // only whether a private view exists (never the password itself): shows the footer's "Private view" link
    NEXT_PUBLIC_PRIVATE_VIEW: process.env.PRIVATE_VIEW_PASSWORD ? "1" : "",
  },
  poweredByHeader: false,
  ...(isPages
    ? { output: "export", basePath, assetPrefix: basePath || undefined, trailingSlash: true, images: { unoptimized: true } }
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                { key: "X-Frame-Options", value: "SAMEORIGIN" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
