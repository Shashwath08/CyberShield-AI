import { createFileRoute } from "@tanstack/react-router";

import { handleAnalyzeUrl } from "@/server/api";

export const Route = createFileRoute("/api/analyze/url")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleAnalyzeUrl(request, { safeBrowsingKey: process.env["GOOGLE_SAFE_BROWSING_API_KEY"] }),
    },
  },
});
