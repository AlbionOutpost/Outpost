import { adsenseClient } from "@/components/adsense-loader";

/** The authorised-seller declaration AdSense asks for, derived from the configured publisher id. */
export function GET() {
  const client = adsenseClient();
  const body = client
    ? `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "# No advertising seller is configured for this site.\n";
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
