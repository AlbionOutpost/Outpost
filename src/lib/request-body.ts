import { HttpError } from "./http-error";

/** Counts wire bytes and stops reading before parsing untrusted JSON, forms or webhooks. */
export async function readBoundedBody(
  request: Pick<Request, "headers" | "body">,
  maxBytes: number,
) {
  const declared = request.headers.get("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    await request.body?.cancel().catch(() => {});
    throw new HttpError(413, "Request too large");
  }
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedText(
  request: Pick<Request, "headers" | "body">,
  maxBytes: number,
) {
  return new TextDecoder().decode(await readBoundedBody(request, maxBytes));
}
