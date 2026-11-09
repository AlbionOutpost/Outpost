/* Pages render here, in the stateless Worker, which bills CPU time only. They used to render in
 * a per-browser-session Durable Object (`OutpostSession`), chosen for the Free plan's CPU limit;
 * a Durable Object bills wall-clock time while any request, timer or pending I/O keeps it in
 * memory, and that object cost 43 to 250 s of billed time per request (Nov 2026).
 *
 * Every render still ends within RENDER_DEADLINE, streamed body included: past it the client
 * gets what has been sent, or a 504 if nothing has. Background work handed to waitUntil gets
 * BACKGROUND_DEADLINE. Both timers are cleared the moment their work settles. */
const RENDER_DEADLINE = 30_000;
const BACKGROUND_DEADLINE = 10_000;

/** A promise that resolves "expired" after `ms`, and the function that disarms it. */
function deadline(ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<"expired">((resolve) => {
    timer = setTimeout(() => resolve("expired"), ms);
  });
  return { expired, clear: () => clearTimeout(timer) };
}

export async function withDeadline(work: Promise<Response>): Promise<Response> {
  const { expired, clear } = deadline(RENDER_DEADLINE);
  let first: Response | "expired";
  try {
    first = await Promise.race([work, expired]);
  } catch (error) {
    clear();
    throw error;
  }
  if (first === "expired") {
    // The render keeps no reference to us; let it fail quietly when it finally settles.
    work.then((late) => late.body?.cancel()).catch(() => {});
    return new Response("Outpost took too long to answer. Please try again.", {
      status: 504,
      headers: { "Cache-Control": "private, no-store", "Retry-After": "5" },
    });
  }
  const response = first;
  if (!response.body) {
    clear();
    return response;
  }
  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      let next: ReadableStreamReadResult<Uint8Array> | "expired";
      try {
        next = await Promise.race([reader.read(), expired]);
      } catch (error) {
        clear();
        controller.error(error);
        return;
      }
      if (next === "expired") {
        reader.cancel("Render deadline").catch(() => {});
        controller.close();
        return;
      }
      if (next.done) {
        clear();
        controller.close();
        return;
      }
      controller.enqueue(next.value);
    },
    cancel(reason) {
      clear();
      return reader.cancel(reason);
    },
  });
  return new Response(body, response);
}

/* Background work the framework hands to waitUntil (cache writes, after() callbacks) is cut
 * off after BACKGROUND_DEADLINE; the timer goes as soon as the work settles. */
export function boundedContext<C extends { waitUntil(promise: Promise<unknown>): void }>(
  ctx: C,
): C {
  const waitUntil = (promise: Promise<unknown>) => {
    const { expired, clear } = deadline(BACKGROUND_DEADLINE);
    ctx.waitUntil(Promise.race([Promise.resolve(promise).catch(() => {}), expired]).finally(clear));
  };
  return new Proxy(ctx, {
    get(target, property) {
      if (property === "waitUntil") return waitUntil;
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
