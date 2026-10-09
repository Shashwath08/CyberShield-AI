import { createFileRoute } from "@tanstack/react-router";

import { handleHealth } from "@/server/api";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () => handleHealth({ safeBrowsingKey: process.env["GOOGLE_SAFE_BROWSING_API_KEY"] }),
    },
  },
});
