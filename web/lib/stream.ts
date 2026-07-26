import type { Decision, StreamEvent } from "./types";
import { DEMO_SCRIPTS } from "./demo";

/** Backend base URL. Unset -> the UI runs entirely in browser demo mode. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";
export const IS_DEMO = API_BASE === "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Parse an NDJSON fetch body into a stream of typed events. */
async function* parseNdjson(res: Response): AsyncGenerator<StreamEvent> {
  if (!res.body) throw new Error("no response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line) as StreamEvent;
    }
  }
  const tail = buffer.trim();
  if (tail) yield JSON.parse(tail) as StreamEvent;
}

async function* demoStream(events: StreamEvent[]): AsyncGenerator<StreamEvent> {
  for (const event of events) {
    yield event;
    // Pace it so the pipeline animates; the communicator step waits longer to
    // stand in for a real model call.
    await sleep(event.type === "node" && event.node === "communicator" ? 1100 : 620);
  }
}

/** Start a run. Yields events until the approval gate or completion. */
export async function* runStream(scenario: string): AsyncGenerator<StreamEvent> {
  if (IS_DEMO) {
    yield* demoStream(DEMO_SCRIPTS[scenario].start);
    return;
  }
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`start failed: ${res.status}`);
  yield* parseNdjson(res);
}

/** Resume a paused run with the human decision. Yields the remaining events. */
export async function* resumeStream(
  scenario: string,
  threadId: string,
  decision: Decision,
): AsyncGenerator<StreamEvent> {
  if (IS_DEMO) {
    yield* demoStream(DEMO_SCRIPTS[scenario].resume[decision]);
    return;
  }
  const res = await fetch(`${API_BASE}/api/runs/resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread_id: threadId, scenario, decision }),
  });
  if (!res.ok) throw new Error(`resume failed: ${res.status}`);
  yield* parseNdjson(res);
}
