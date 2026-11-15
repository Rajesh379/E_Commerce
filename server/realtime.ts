import type { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { COOKIE_NAME, verifyAuthToken } from './auth.ts';
import { db } from './db.ts';

interface SocketMeta {
  userId: string;
  role: string;
}

const clientsByUser = new Map<string, Set<WebSocket>>();
const socketMeta = new WeakMap<WebSocket, SocketMeta>();

function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function authenticateUpgrade(req: IncomingMessage): SocketMeta | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  let token = cookies[COOKIE_NAME];
  if (!token && req.url) {
    try {
      const url = new URL(req.url, 'http://localhost');
      token = url.searchParams.get('token') || '';
    } catch {
      token = '';
    }
  }
  if (!token) return null;
  const decoded = verifyAuthToken(token);
  if (!decoded) return null;
  return { userId: decoded.userId, role: decoded.role };
}

export function attachWebSocketServer(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const meta = authenticateUpgrade(req);
    if (!meta) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    socketMeta.set(ws, meta);
    let userSockets = clientsByUser.get(meta.userId);
    if (!userSockets) {
      userSockets = new Set();
      clientsByUser.set(meta.userId, userSockets);
    }
    userSockets.add(ws);

    ws.send(JSON.stringify({ type: 'ws:connected', userId: meta.userId }));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    ws.on('close', () => {
      const set = clientsByUser.get(meta.userId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          clientsByUser.delete(meta.userId);
        }
      }
    });
  });
}

export function emitToUser(userId: string, payload: Record<string, unknown>): void {
  const sockets = clientsByUser.get(userId);
  if (!sockets || sockets.size === 0) return;
  const serialized = JSON.stringify(payload);
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

export function emitToAdmins(payload: Record<string, unknown>): void {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all() as { id: string }[];
  for (const admin of admins) {
    emitToUser(admin.id, payload);
  }
}
