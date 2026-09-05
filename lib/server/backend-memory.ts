/**
 * In-process backend / 記憶體後端
 *
 * The default for local development and for every unit test: no credentials, no
 * network, fully deterministic. Rooms live only in this process, so it is not a
 * deployment target — see PROJECT_STATUS.
 */

import type { Backend, RoomRecord } from "@/lib/server/backend";
import { ApiFault } from "@/lib/server/fault";

type Db = { rooms: Map<string, RoomRecord>; codes: Map<string, string> };

const globalRef = globalThis as unknown as { __mkkDb?: Db };

function db(): Db {
  if (!globalRef.__mkkDb) {
    globalRef.__mkkDb = { rooms: new Map(), codes: new Map() };
  }
  return globalRef.__mkkDb;
}

/** Deep copy so callers can never mutate stored state by reference. */
function clone(room: RoomRecord): RoomRecord {
  return structuredClone(room);
}

export const memoryBackend: Backend = {
  name: "memory",

  async create(room) {
    const { rooms, codes } = db();
    if (codes.has(room.code)) {
      throw new ApiFault("internal_error", "Room code collision");
    }
    rooms.set(room.id, clone(room));
    codes.set(room.code, room.id);
  },

  async loadById(roomId) {
    const room = db().rooms.get(roomId);
    return room ? clone(room) : null;
  },

  async loadByCode(code) {
    const roomId = db().codes.get(code);
    return roomId ? this.loadById(roomId) : null;
  },

  async save(room, expectedVersion) {
    const { rooms } = db();
    const current = rooms.get(room.id);
    if (!current) throw new ApiFault("room_not_found", "Room not found");
    if (current.version !== expectedVersion) return false;
    rooms.set(room.id, clone(room));
    return true;
  },

  async reset() {
    globalRef.__mkkDb = { rooms: new Map(), codes: new Map() };
  },
};
