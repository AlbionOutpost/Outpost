import type { NextRequest } from "next/server";
import { contactResponse } from "@/lib/contact-request";

/** The contact form: one mail to the operator per valid, verified submission (src/lib/contact-request.ts). */
export const POST = (request: NextRequest) => contactResponse(request);
