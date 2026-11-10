// ---------------------------------------------------------------------------
// worker/src/cloudflare-env.d.ts — Ambient Cloudflare Workers & Durable Object
// types used by `worker/src/index.ts` and `worker/src/room.ts`.
// Allows `npx tsc --noEmit -p worker/tsconfig.json` to run cleanly using the
// root TypeScript compiler even when `worker/node_modules` is not installed.
// ---------------------------------------------------------------------------

interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  readonly name?: string;
}

interface DurableObjectStub {
  readonly id: DurableObjectId;
  readonly name?: string;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespace {
  newUniqueId(options?: { jurisdiction?: string }): DurableObjectId;
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface SqlStorageCursor<T = Record<string, unknown>> extends Iterable<T> {
  toArray(): T[];
  one(): T;
}

interface SqlStorage {
  exec<T = Record<string, unknown>>(query: string, ...bindings: unknown[]): SqlStorageCursor<T>;
}

interface DurableObjectStorage {
  readonly sql?: SqlStorage;
}

interface DurableObjectState {
  readonly id: DurableObjectId;
  readonly storage?: DurableObjectStorage;
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
}

declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface ResponseInit {
  webSocket?: WebSocket | null;
}
