// Authoritative PvP duel server. Run with:  npm run duel-server
// Imports the SAME pure engine modules as the client — resolveCast is the
// single source of truth for damage on both sides of the wire.
//
// Anti-cheat is intentionally minimal for now (plausibility checks on
// metrics). Full keystroke-stream validation is the follow-up.

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { resolveCast } from '../src/engine/cast';
import { duelSpellAt, DUEL_HP, DUEL_PORT, type ClientMsg, type ServerMsg } from '../src/engine/duel';

interface Player {
  ws: WebSocket;
  name: string;
  classId: string;
  hp: number;
  nextIndex: number;
}

interface Room {
  code: string;
  seed: number;
  started: boolean;
  players: Player[];
}

const rooms = new Map<string, Room>();
const roomOf = new Map<WebSocket, Room>();

function send(ws: WebSocket, msg: ServerMsg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function code4(): string {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no easily-confused chars
  let c = '';
  do {
    c = Array.from({ length: 4 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
  } while (rooms.has(c));
  return c;
}

function endDuel(room: Room, loser: Player, reason: 'ko' | 'disconnect') {
  for (const p of room.players) {
    send(p.ws, { t: 'end', won: p !== loser, reason });
  }
  cleanup(room);
}

function cleanup(room: Room) {
  rooms.delete(room.code);
  for (const p of room.players) roomOf.delete(p.ws);
}

// Hosted platforms (Render etc.) inject PORT and probe with plain HTTP, so
// wrap the WebSocket server in a tiny HTTP server that answers health checks.
const port = Number(process.env.PORT ?? DUEL_PORT);
const httpServer = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Type-Caster duel server is up. Connect via WebSocket.');
});
const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(port, () => {
  console.log(`Type-Caster duel server listening on ws://localhost:${port}`);
});

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(String(raw)) as ClientMsg;
    } catch {
      return;
    }

    if (msg.t === 'create') {
      const room: Room = { code: code4(), seed: 0, started: false, players: [] };
      room.players.push({
        ws,
        name: String(msg.name).slice(0, 20) || 'Caster',
        classId: String(msg.classId),
        hp: DUEL_HP,
        nextIndex: 0,
      });
      rooms.set(room.code, room);
      roomOf.set(ws, room);
      send(ws, { t: 'created', code: room.code });
      return;
    }

    if (msg.t === 'join') {
      const room = rooms.get(String(msg.code).toUpperCase());
      if (!room || room.started || room.players.length !== 1) {
        send(ws, { t: 'error', message: 'Room not found (or already full).' });
        return;
      }
      room.players.push({
        ws,
        name: String(msg.name).slice(0, 20) || 'Caster',
        classId: String(msg.classId),
        hp: DUEL_HP,
        nextIndex: 0,
      });
      roomOf.set(ws, room);
      room.started = true;
      room.seed = (Math.random() * 2 ** 32) >>> 0;
      const [a, b] = room.players;
      send(a.ws, { t: 'start', seed: room.seed, foeName: b.name, foeClassId: b.classId, hp: DUEL_HP });
      send(b.ws, { t: 'start', seed: room.seed, foeName: a.name, foeClassId: a.classId, hp: DUEL_HP });
      return;
    }

    const room = roomOf.get(ws);
    if (!room || !room.started) return;
    const me = room.players.find((p) => p.ws === ws)!;
    const foe = room.players.find((p) => p.ws !== ws)!;

    if (msg.t === 'progress') {
      const frac = Math.max(0, Math.min(1, Number(msg.frac) || 0));
      send(foe.ws, { t: 'progress', frac });
      return;
    }

    if (msg.t === 'cast') {
      // Order and identity of spells is server-decided; reject replays/skips.
      if (msg.index !== me.nextIndex) return;
      const m = msg.metrics;
      if (
        !m ||
        !Number.isFinite(m.typedChars) ||
        !Number.isFinite(m.correctChars) ||
        !Number.isFinite(m.elapsedSeconds) ||
        m.typedChars < 0 ||
        m.typedChars > 500 ||
        m.correctChars > m.typedChars ||
        m.elapsedSeconds < 0.3 // plausibility floor — nobody types a phrase faster
      ) {
        return;
      }
      const spell = duelSpellAt(room.seed, msg.index);
      me.nextIndex += 1;
      const res = resolveCast(spell, {
        typedChars: m.typedChars,
        correctChars: m.correctChars,
        elapsedSeconds: m.elapsedSeconds,
        completed: Boolean(m.completed),
      });

      let loser: Player | null = null;
      if (res.outcome === 'backfire') {
        me.hp = Math.max(0, me.hp - res.damageToSelf);
        if (me.hp <= 0) loser = me;
      } else {
        foe.hp = Math.max(0, foe.hp - res.damageToEnemy);
        if (foe.hp <= 0) loser = foe;
      }

      for (const p of room.players) {
        const isMe = p === me;
        send(p.ws, {
          t: 'state',
          you: p.hp,
          foe: (p === me ? foe : me).hp,
          event: {
            who: isMe ? 'you' : 'foe',
            outcome: res.outcome,
            dmg: res.outcome === 'backfire' ? res.damageToSelf : res.damageToEnemy,
            spellName: spell.name,
            wpm: Math.round(res.wpm),
          },
        });
      }
      if (loser) endDuel(room, loser, 'ko');
    }
  });

  ws.on('close', () => {
    const room = roomOf.get(ws);
    if (!room) return;
    if (room.started) {
      const me = room.players.find((p) => p.ws === ws)!;
      endDuel(room, me, 'disconnect');
    } else {
      cleanup(room);
    }
  });
});
