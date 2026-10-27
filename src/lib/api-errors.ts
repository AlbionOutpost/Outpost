import { NextResponse } from "next/server";
import { z } from "zod";
import { logEvent } from "./logging";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function apiHandler<T extends unknown[]>(
  operation: string,
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      const response = await handler(...args);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (e) {
      if (e instanceof HttpError)
        return NextResponse.json(
          { error: e.message },
          { status: e.status, headers: { "Cache-Control": "private, no-store" } },
        );
      if (e instanceof z.ZodError || e instanceof SyntaxError)
        return NextResponse.json(
          { error: "Invalid request data" },
          { status: 400, headers: { "Cache-Control": "private, no-store" } },
        );
      logEvent("error", "api_failure", { operation, code: "SERVICE_UNAVAILABLE" });
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  };
}
