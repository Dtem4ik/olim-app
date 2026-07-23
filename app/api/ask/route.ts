import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { streamGroundedAnswer } from "@/lib/rag/answer";
import { ASK_RATE, isAiConfigured } from "@/lib/rag/config";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/client-ip";

// Streams a live LLM answer — never statically cached or prerendered. Node
// runtime: the LLM client stays server-side (never in the browser bundle).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({ q: z.string().trim().min(1).max(300) });

export async function POST(req: NextRequest) {
  // Env-gated: without a key the ask box degrades to "AI-ответы скоро" client-
  // side; a direct call still gets an honest, non-crashing signal.
  if (!isAiConfigured()) {
    return NextResponse.json({ disabled: true }, { status: 503 });
  }

  // Global RPM ceiling first (protects the shared free-tier Gemini quota), then a
  // per-client cap. Either tripping → friendly "try later"; keyword search is
  // unaffected.
  const globalHit = rateLimit("ask:global", {
    limit: ASK_RATE.global,
    windowMs: ASK_RATE.windowMs,
  });
  const ip = await getClientIp();
  const ipHit = rateLimit(`ask:ip:${ip}`, { limit: ASK_RATE.perIp, windowMs: ASK_RATE.windowMs });
  if (!globalHit.ok || !ipHit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let q: string;
  try {
    const parsed = bodySchema.parse(await req.json());
    q = parsed.q;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const sse = (event: string, data: unknown) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of streamGroundedAnswer(q)) {
          if (req.signal.aborted) break;
          const { type, ...rest } = ev;
          controller.enqueue(sse(type, rest));
        }
      } catch {
        controller.enqueue(sse("error", {}));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
