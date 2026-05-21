/**
 * cashflow-backend — sync minimal pour cashflow.html
 *
 * Stack : Express + better-sqlite3 + google-auth-library + jsonwebtoken.
 * Modèle : un blob JSON par utilisateur (état complet de l'app), last-write-wins
 *          avec détection de conflit basique via lastSeenUpdatedAt.
 *
 * Endpoints :
 *   POST /api/auth/google  { credential }  → { token, user }
 *   POST /api/auth/dev     { email }       → { token, user }   (si ALLOW_DEV_LOGIN=1)
 *   GET  /api/sync         (Bearer token)  → { data, updatedAt }
 *   PUT  /api/sync         (Bearer token, { data, lastSeenUpdatedAt? })
 *                                          → { updatedAt, bytes }
 *                                          ou 409 + { serverData, serverUpdatedAt }
 *   GET  /api/health                       → { ok, ts }
 */
import express from 'express';
import Database from 'better-sqlite3';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT             = Number(process.env.PORT) || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET       = process.env.JWT_SECRET || 'dev-secret-change-me';
const STATIC_DIR       = process.env.STATIC_DIR
  ? path.resolve(process.env.STATIC_DIR)
  : path.join(__dirname, '..');

if (!GOOGLE_CLIENT_ID) {
  console.warn('[cashflow-backend] ⚠ GOOGLE_CLIENT_ID non défini. Configure backend/.env avant de tester l\'auth Google.');
}
if (JWT_SECRET === 'dev-secret-change-me') {
  console.warn('[cashflow-backend] ⚠ JWT_SECRET par défaut. À changer en production (n\'importe quelle longue chaîne aléatoire).');
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT,
    provider    TEXT,
    data        TEXT,
    updated_at  TEXT,
    created_at  TEXT
  );
`);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const auth = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Le frontend obtient un ID-token via Google Identity Services et le POST ici.
// On vérifie l'audience contre notre client_id, on (re)crée l'utilisateur, on
// renvoie un JWT applicatif (à transporter en Bearer pour /api/sync).
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'Backend GOOGLE_CLIENT_ID non configuré.' });
    }
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing credential' });
    const ticket = await googleClient.verifyIdToken({
      idToken: credential, audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const userId = `google:${payload.sub}`;
    const email  = payload.email || '';
    const now    = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      db.prepare(`INSERT INTO users (id, email, provider, created_at) VALUES (?, ?, 'google', ?)`)
        .run(userId, email, now);
    } else {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId);
    }
    const token = jwt.sign({ uid: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  } catch (err) {
    console.error('[auth/google] échec :', err.message);
    res.status(401).json({ error: 'Google ID token invalide.' });
  }
});

// Login de développement (sans OAuth) — utile pour tester en local
// avant de configurer le client Google. À NE PAS activer en prod.
if (process.env.ALLOW_DEV_LOGIN === '1') {
  app.post('/api/auth/dev', (req, res) => {
    const email  = String(req.body?.email || 'dev@example.com').slice(0, 200);
    const userId = `dev:${email}`;
    const now    = new Date().toISOString();
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!existing) {
      db.prepare(`INSERT INTO users (id, email, provider, created_at) VALUES (?, ?, 'dev', ?)`)
        .run(userId, email, now);
    }
    const token = jwt.sign({ uid: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  });
  console.log('[cashflow-backend] 🛠  Dev-login activé : POST /api/auth/dev { email }');
}

app.get('/api/sync', auth, (req, res) => {
  const row = db.prepare('SELECT data, updated_at FROM users WHERE id = ?').get(req.user.uid);
  res.json({
    data: row?.data ? JSON.parse(row.data) : null,
    updatedAt: row?.updated_at || null,
  });
});

app.put('/api/sync', auth, (req, res) => {
  const { data, lastSeenUpdatedAt } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid `data`' });
  }
  const row = db.prepare('SELECT data, updated_at FROM users WHERE id = ?').get(req.user.uid);
  // Conflit naïve : le client envoie la version qu'il avait vue ;
  // si le serveur a évolué entre temps, on renvoie 409 + l'état serveur.
  if (lastSeenUpdatedAt && row?.updated_at && row.updated_at !== lastSeenUpdatedAt) {
    return res.status(409).json({
      error: 'conflict',
      message: 'Le serveur a une version plus récente.',
      serverData:      row?.data ? JSON.parse(row.data) : null,
      serverUpdatedAt: row?.updated_at || null,
    });
  }
  const json = JSON.stringify(data);
  const now  = new Date().toISOString();
  db.prepare('UPDATE users SET data = ?, updated_at = ? WHERE id = ?')
    .run(json, now, req.user.uid);
  res.json({ updatedAt: now, bytes: json.length });
});

app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Vérifie qu'on trouve cashflow.html — sinon journal clair au démarrage.
const cashflowPath = path.join(STATIC_DIR, 'cashflow.html');
const cashflowExists = fs.existsSync(cashflowPath);
if (!cashflowExists) {
  console.warn(`[cashflow-backend] ⚠ cashflow.html introuvable dans ${STATIC_DIR}`);
  console.warn('[cashflow-backend]   Le serveur démarre mais ne pourra rien afficher.');
  console.warn(`[cashflow-backend]   Place cashflow.html dans ${STATIC_DIR}, ou définis STATIC_DIR dans .env.`);
}

// Route explicite "/" → cashflow.html (sinon express.static peut servir un
// index.html résiduel et donner l'impression que rien ne fonctionne).
app.get('/', (req, res, next) => {
  if (!cashflowExists) return next();
  res.sendFile(cashflowPath);
});

// En dev, sert le reste de cashflow.html et ses voisins. En prod, faites
// servir les statiques par nginx/caddy et gardez /api/* sur ce backend.
app.use(express.static(STATIC_DIR));

// 404 explicite avec un message utile.
app.use((req, res) => {
  const msg = cashflowExists
    ? "cette URL ne correspond à aucun fichier."
    : "<b>cashflow.html</b> est introuvable dans <code>" + STATIC_DIR + "</code>.";
  res.status(404).type('html').send(
    '<h2 style="font-family:sans-serif;color:#7c2d12;">404 — Fichier introuvable</h2>'
    + '<p style="font-family:sans-serif">Le serveur tourne mais ' + msg + '</p>'
    + '<p style="font-family:sans-serif"><a href="/">Retour à l accueil</a></p>'
  );
});

const openBrowser = (url) => {
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
            : process.platform === 'darwin' ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, () => {});
};

app.listen(PORT, () => {
  console.log(`[cashflow-backend] ▶ http://localhost:${PORT}`);
  console.log(`[cashflow-backend] static dir: ${STATIC_DIR}`);
  console.log(`[cashflow-backend] cashflow.html : ${cashflowExists ? 'OK' : 'MANQUANT'}`);
  console.log(`[cashflow-backend] db: ${path.join(__dirname, 'data.db')}`);
  if (process.env.OPEN_BROWSER !== '0' && cashflowExists) {
    setTimeout(() => openBrowser(`http://localhost:${PORT}/`), 300);
  }
});
