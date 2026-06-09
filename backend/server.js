/**
 * cashflow-backend — sync minimal pour cashflow.html
 *
 * Stack : Express + google-auth-library + jsonwebtoken + fichier JSON.
 *
 * Stockage : data.json à côté de server.js. Une seule "table" virtuelle :
 *     { users: { [uid]: { email, provider, data, updated_at, created_at } } }
 *
 * Pourquoi pas SQLite ? better-sqlite3 nécessite Python + Visual Studio
 * Build Tools pour se compiler sur Windows si les binaires prébuilds
 * ne sont pas disponibles. Un fichier JSON simple suffit largement
 * pour un backend mono-utilisateur ou petite équipe (~quelques Mo),
 * sans aucune compilation native.
 *
 * Endpoints :
 *   POST /api/auth/google  { credential }  → { token, user }
 *   POST /api/auth/dev     { email }       → { token, user }   (si ALLOW_DEV_LOGIN=1)
 *   GET  /api/sync         (Bearer)        → { data, updatedAt }
 *   PUT  /api/sync         (Bearer)        → { updatedAt, bytes } ou 409 + serverData
 *   GET  /api/health                       → { ok, ts, version }
 *   GET  /api/version                      → { backend, cashflowHtml }
 */
import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PKG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')); }
  catch { return { version: 'unknown' }; }
})();

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

/* ---------- JSON file store ---------- */
const DATA_PATH = path.join(__dirname, 'data.json');
let store = { users: {} };
const loadStore = () => {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    store = parsed && typeof parsed === 'object' ? parsed : { users: {} };
    if (!store.users || typeof store.users !== 'object') store.users = {};
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[cashflow-backend] data.json illisible :', err.message);
    }
    store = { users: {} };
  }
};
const saveStore = () => {
  // Écriture atomique : on écrit dans un fichier .tmp puis on renomme.
  const tmp = DATA_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, DATA_PATH);
};
const getUser = (id) => store.users[id] || null;
const upsertUser = (id, fields) => {
  const now = new Date().toISOString();
  if (!store.users[id]) {
    store.users[id] = {
      email: '', provider: '', data: null,
      updated_at: null, created_at: now,
      ...fields,
    };
  } else {
    Object.assign(store.users[id], fields);
  }
  saveStore();
  return store.users[id];
};
loadStore();

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
    upsertUser(userId, { email, provider: 'google' });
    const token = jwt.sign({ uid: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  } catch (err) {
    console.error('[auth/google] échec :', err.message);
    res.status(401).json({ error: 'Google ID token invalide.' });
  }
});

if (process.env.ALLOW_DEV_LOGIN === '1') {
  app.post('/api/auth/dev', (req, res) => {
    const email  = String(req.body?.email || 'dev@example.com').slice(0, 200);
    const userId = `dev:${email}`;
    upsertUser(userId, { email, provider: 'dev' });
    const token = jwt.sign({ uid: userId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, email } });
  });
  console.log('[cashflow-backend] 🛠  Dev-login activé : POST /api/auth/dev { email }');
}

app.get('/api/sync', auth, (req, res) => {
  const u = getUser(req.user.uid);
  res.json({
    data: u?.data || null,
    updatedAt: u?.updated_at || null,
  });
});

app.put('/api/sync', auth, (req, res) => {
  const { data, lastSeenUpdatedAt } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid `data`' });
  }
  const u = getUser(req.user.uid);
  if (lastSeenUpdatedAt && u?.updated_at && u.updated_at !== lastSeenUpdatedAt) {
    return res.status(409).json({
      error: 'conflict',
      message: 'Le serveur a une version plus récente.',
      serverData:      u.data || null,
      serverUpdatedAt: u.updated_at,
    });
  }
  const now = new Date().toISOString();
  upsertUser(req.user.uid, { data, updated_at: now });
  res.json({ updatedAt: now, bytes: JSON.stringify(data).length });
});

app.get('/api/health', (req, res) => res.json({
  ok: true, ts: new Date().toISOString(), version: PKG.version,
}));

app.get('/api/version', (req, res) => {
  let bytes = null, mtime = null;
  try {
    const st = fs.statSync(cashflowPath);
    bytes = st.size;
    mtime = st.mtime.toISOString();
  } catch {}
  res.json({
    backend: PKG.version,
    cashflowHtml: { exists: cashflowExists, bytes, mtime, path: cashflowPath },
    users: Object.keys(store.users).length,
  });
});

const cashflowPath = path.join(STATIC_DIR, 'cashflow.html');
const cashflowExists = fs.existsSync(cashflowPath);
if (!cashflowExists) {
  console.warn(`[cashflow-backend] ⚠ cashflow.html introuvable dans ${STATIC_DIR}`);
  console.warn('[cashflow-backend]   Le serveur démarre mais ne pourra rien afficher.');
  console.warn(`[cashflow-backend]   Place cashflow.html dans ${STATIC_DIR}, ou définis STATIC_DIR dans .env.`);
}

app.get('/', (req, res, next) => {
  if (!cashflowExists) return next();
  res.sendFile(cashflowPath);
});

app.use(express.static(STATIC_DIR));

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
  console.log(`[cashflow-backend] ▶ http://localhost:${PORT}    (v${PKG.version})`);
  console.log(`[cashflow-backend] static dir   : ${STATIC_DIR}`);
  console.log(`[cashflow-backend] cashflow.html : ${cashflowExists ? 'OK' : 'MANQUANT'}`);
  console.log(`[cashflow-backend] data file    : ${DATA_PATH}`);
  console.log(`[cashflow-backend] utilisateurs : ${Object.keys(store.users).length}`);
  if (process.env.OPEN_BROWSER !== '0' && cashflowExists) {
    setTimeout(() => openBrowser(`http://localhost:${PORT}/`), 300);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[cashflow-backend] Le port ${PORT} est deja utilise.`);
    console.error(`[cashflow-backend] Le serveur tourne probablement deja (autostart).`);
    console.error(`[cashflow-backend] Ouvre http://localhost:${PORT}/ dans ton navigateur.`);
    if (process.env.OPEN_BROWSER !== '0') {
      openBrowser(`http://localhost:${PORT}/`);
    }
    process.exit(0);
  }
  console.error('[cashflow-backend] Erreur serveur:', err);
  process.exit(1);
});
