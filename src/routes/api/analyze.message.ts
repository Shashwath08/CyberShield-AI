import { createFileRoute } from "@tanstack/react-router";

import { handleAnalyzeMessage } from "@/server/api";

export const Route = createFileRoute("/api/analyze/message")({
  server: {
    handlers: {
      POST: ({ request }) => handleAnalyzeMessage(request),
    },
  },
});
