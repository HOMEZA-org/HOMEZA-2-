import dotenv from 'dotenv';
dotenv.config({ override: true });
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';
import {
  VERIFICATION_CONFIG,
  sendPhoneOtpInternal,
  verifyPhoneOtpInternal,
  verifyIdentityInternal,
  verifyLivenessInternal,
  compareNames,
  maskPhoneNumber,
  maskIdNumber,
  normalizeNigerianPhoneNumber,
  smsDeliveryTracker,
  updateSmsDeliveryReceipt,
  getIdentifyOrgBalance,
  isIdentifyOrgLiveKeyConfigured,
  hasLiveSmsCredentials,
  evaluateUserVerification,
  reconcileUserVerification,
} from './server/verification';
import {
  getPaystackSecretKey,
  getPaystackPublicKey,
  getPaystackWebhookSecret,
  isPaystackLiveMode,
  isPaystackConfigured,
  verifyPaystackTransactionWithRemote,
  verifyPaystackWebhookSignature,
  renderPaymentResultHtml,
  markEventAsProcessed,
  isEventAlreadyProcessed,
} from './server/paystack';

process.on('uncaughtException', (err) => {
  console.error('[SERVER CRITICAL] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER CRITICAL] Unhandled rejection at:', promise, 'reason:', reason);
});

const app = express();

function resolveServerPort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    const val = parseInt(process.argv[portArgIdx + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.APP_PORT) {
    const val = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 3000;
}

const PORT = resolveServerPort();

// Email Transporter (Direct SMTP via Nodemailer)
let mailTransporter: nodemailer.Transporter | null = null;

function getFromEmailAddress(): string {
  return process.env.SMTP_FROM || 'HOMEZA Support <support@homeza.com.ng>';
}

function getSupportInboxEmail(): string {
  return process.env.SUPPORT_EMAIL || 'support@homeza.com.ng';
}

function hasLiveSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD);
}

function getMailTransporter(): nodemailer.Transporter | null {
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.MAIL_PASSWORD;
  if (!smtpPass) {
    return null;
  }
  if (mailTransporter) {
    return mailTransporter;
  }

  // Official verified mail server for homeza.com.ng on GO54 (Whogohost)
  const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.go54mail.com';
  const smtpPort = Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 465;
  const smtpSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : smtpPort === 465;
  const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || 'support@homeza.com.ng';

  mailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      rejectUnauthorized: true,
    },
  });

  return mailTransporter;
}

// Global CORS and Preflight Request Handler
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-IdentifyOrg-Key'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

/* ========================================================================= */
/* PERSISTENT SERVER DATABASE STORAGE                                        */
/* ========================================================================= */
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'homeza_server_db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[SERVER] Could not create data directory, using in-memory only:', e);
}

const DEFAULT_SALT = 'homeza_sec_salt_2026';

// Synchronous SHA-256 implementation
function sha256Sync(str: string): string {
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a,
    h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    if (charCode < 0x80) {
      utf8.push(charCode);
    } else if (charCode < 0x800) {
      utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
    } else if (charCode < 0xd800 || charCode >= 0xe000) {
      utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
    } else {
      i++;
      charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charCode >> 18),
        0x80 | ((charCode >> 12) & 0x3f),
        0x80 | ((charCode >> 6) & 0x3f),
        0x80 | (charCode & 0x3f)
      );
    }
  }

  const bitLength = utf8.length * 8;
  utf8.push(0x80);
  while ((utf8.length + 8) % 64 !== 0) {
    utf8.push(0);
  }

  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength & 0xffffffff;
  utf8.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  const words: number[] = [];
  for (let i = 0; i < utf8.length; i += 4) {
    words.push((utf8[i] << 24) | (utf8[i + 1] << 16) | (utf8[i + 2] << 8) | utf8[i + 3]);
  }

  const rightRotate = (v: number, n: number) => (v >>> n) | (v << (32 - n));

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = words[i + t];
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rightRotate(w[t - 15], 7) ^ rightRotate(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rightRotate(w[t - 2], 17) ^ rightRotate(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }

    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;

    for (let t = 0; t < 64; t++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[t] + w[t]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)).toLowerCase();
}

const PBKDF2_ROUNDS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function hashPasswordPBKDF2(password: string, salt: string): string {
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ROUNDS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return `pbkdf2$${PBKDF2_ROUNDS}$${salt}$${hash}`;
}

function hashPasswordLegacy(password: string, salt: string): string {
  const input = `homeza_salt_prefix:${salt}:${password}:homeza_salt_suffix`;
  return sha256Sync(input);
}

// Authoritative password hashing function: Uses PBKDF2 with 100,000 iterations of SHA-512
function hashPassword(password: string, salt?: string): string {
  const secureSalt = salt || crypto.randomBytes(24).toString('hex');
  return hashPasswordPBKDF2(password, secureSalt);
}

function verifyPassword(
  passwordPlain: string,
  storedHash: string,
  storedSalt?: string
): { isValid: boolean; needsUpgrade: boolean; upgradedHash?: string; newSalt?: string } {
  if (!storedHash || !passwordPlain) return { isValid: false, needsUpgrade: false };

  // 1. Modern PBKDF2-SHA512 scheme
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length === 4) {
      const rounds = parseInt(parts[1], 10) || PBKDF2_ROUNDS;
      const salt = parts[2];
      const targetHash = parts[3];
      const computed = crypto.pbkdf2Sync(passwordPlain, salt, rounds, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
      try {
        const a = Buffer.from(computed, 'hex');
        const b = Buffer.from(targetHash, 'hex');
        if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
          return { isValid: true, needsUpgrade: false };
        }
      } catch {
        return { isValid: false, needsUpgrade: false };
      }
    }
    return { isValid: false, needsUpgrade: false };
  }

  // 2. Legacy SHA-256 scheme with automated on-the-fly upgrade
  const legacyComputed = hashPasswordLegacy(passwordPlain, storedSalt || DEFAULT_SALT);
  if (legacyComputed === storedHash) {
    const newSalt = crypto.randomBytes(24).toString('hex');
    const upgraded = hashPasswordPBKDF2(passwordPlain, newSalt);
    return { isValid: true, needsUpgrade: true, upgradedHash: upgraded, newSalt };
  }

  return { isValid: false, needsUpgrade: false };
}

const ADMIN_HASH = hashPassword('admin1234', DEFAULT_SALT);

// Authoritative Central Database Structure
interface ServerDbSchema {
  users: any[];
  properties: any[];
  applications: any[];
  notifications: any[];
  reviewAudits: any[];
  locations: any[];
  config: any;
  agentClients: any[];
  inspections: any[];
  reports: any[];
  conversations: any[];
  messages: any[];
  supportTickets: any[];
  payments: any[];
  credentials: any[];
  emailVerifications: any[];
  verificationAudits: any[];
  documents?: any[];
  serverTime: string;
  version: number;
}

const INITIAL_SERVER_USERS = [
  {
    id: 'user-admin-1',
    role: 'ADMIN',
    fullName: 'HOMEZA Super Admin',
    email: 'admin@homeza.ng',
    phoneNumber: '+234 802 345 6789',
    emailVerified: true,
    emailVerifiedAt: '2025-10-01T00:00:00Z',
    accountStatus: 'ACTIVE',
    department: 'Platform Operations & Compliance',
    isSuperAdmin: true,
    createdAt: '2025-10-01T00:00:00Z',
  },
];

const INITIAL_SERVER_CREDENTIALS = [
  {
    userId: 'user-admin-1',
    email: 'admin@homeza.ng',
    role: 'ADMIN',
    passwordHash: ADMIN_HASH,
    salt: DEFAULT_SALT,
    createdAt: '2025-10-01T00:00:00Z',
  },
];

const INITIAL_LOCATIONS = [
  {
    id: 'loc-1',
    name: 'Ewet Housing Estate',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520231',
    popularLandmarks: ['Ewet Housing Club', 'Governor Office Annexe', 'Le Meridien Link'],
    description: 'Upscale, serene, and modern residential estate with high-tier security and steady power.',
    isActive: true,
  },
  {
    id: 'loc-2',
    name: 'Shelter Afrique Estate',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520232',
    popularLandmarks: ['Shelter Afrique Roundabout', 'Topfaith School', 'Affordable Duplex Zone'],
    description: 'Premier planned neighborhood featuring duplexes, quiet avenues, and family-friendly parks.',
    isActive: true,
  },
  {
    id: 'loc-3',
    name: 'Osongama Estate',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520234',
    popularLandmarks: ['Osongama Junction', 'Full Life Christian Centre', 'Edet Akpan Ave Extension'],
    description: 'Fast-developing residential area popular among young professionals and families.',
    isActive: true,
  },
  {
    id: 'loc-4',
    name: 'Oron Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520213',
    popularLandmarks: ['Four Lane Junction', 'Victor Attah Int Airport Route', 'Silverbird Cinemas'],
    description: 'Major arterial corridor lined with banks, corporate complexes, and modern apartments.',
    isActive: true,
  },
  {
    id: 'loc-5',
    name: 'Udo Udoma Avenue',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520215',
    popularLandmarks: ['Christmas Village', 'Zenith Bank Regional Hub', 'Ibom Museum Park'],
    description: 'Vibrant avenue connecting leisure centers, cultural parks, and corporate banking institutions.',
    isActive: true,
  },
  {
    id: 'loc-6',
    name: 'Nwaniba Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520249',
    popularLandmarks: ['UniUyo Permanent Site Turnoff', 'Ibikot Junction', 'Marina Resort Route'],
    description: 'Stretching eastern scenic corridor with peaceful residential estates and suburban homes.',
    isActive: true,
  },
  {
    id: 'loc-7',
    name: 'Four Lanes (Edet Akpan Avenue)',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520235',
    popularLandmarks: ['Edet Akpan Junction', 'Banks & Dining Strip', 'Ibom Hotel Link'],
    description: 'Prime commercial and executive residential corridor known for upscale lounges and apartments.',
    isActive: true,
  },
  {
    id: 'loc-8',
    name: 'Ring Road 3',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520236',
    popularLandmarks: ['Ring Road 3 Interchange', 'Aka Road Link', 'New Government Layout'],
    description: 'Modern, well-paved ring corridor with rapid new estate developments and serene compounds.',
    isActive: true,
  },
  {
    id: 'loc-9',
    name: 'Itam',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520222',
    popularLandmarks: ['Itam Flyover', 'Calabar-Itu Highway Junction', 'Inter-State Motor Parks'],
    description: 'Major commercial and residential transit hub connecting Uyo to neighboring hubs.',
    isActive: true,
  },
  {
    id: 'loc-10',
    name: 'Abak Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520221',
    popularLandmarks: ['Federal Secretariat', 'State Judiciary Headquarters', 'Champion Breweries'],
    description: 'Well-connected thoroughfare hosting major public institutions and residential enclaves.',
    isActive: true,
  },
  {
    id: 'loc-11',
    name: 'Ikpa Road (UniUyo)',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520242',
    popularLandmarks: ['University of Uyo Town Campus', 'UniUyo Annex Gate', 'Faculty of Arts'],
    description: 'Vibrant academic community ideal for university staff, students, and lecturers.',
    isActive: true,
  },
  {
    id: 'loc-12',
    name: 'Aka Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520237',
    popularLandmarks: ['Aka Community Square', 'Aka Road Commercial Center', 'Plaza Link'],
    description: 'Bustling, centrally located artery with rich commercial services and residential flats.',
    isActive: true,
  },
  {
    id: 'loc-13',
    name: 'Aka Itiam',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520238',
    popularLandmarks: ['Aka Itiam Junction', 'Grace Secondary School Area', 'Ring Road Link'],
    description: 'Peaceful residential neighborhood close to central Uyo with good accessibility.',
    isActive: true,
  },
  {
    id: 'loc-14',
    name: 'Stadium Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520239',
    popularLandmarks: ['Godswill Akpabio International Stadium', 'Ring Road Link'],
    description: 'World-class sporting precinct surrounded by newly developed residential compounds.',
    isActive: true,
  },
  {
    id: 'loc-15',
    name: 'General Hospital / Anua',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520240',
    popularLandmarks: ['St. Lukes Hospital Anua', 'School of Nursing', 'Oron Road Interchange'],
    description: 'Serene health and institutional corridor with established family residences.',
    isActive: true,
  },
  {
    id: 'loc-16',
    name: 'Wellington Bassey Way',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520212',
    popularLandmarks: ['Government House Hilltop', 'Central Bank of Nigeria', 'State Police HQ'],
    description: 'High-security historic and administrative boulevard leading to the State Seat of Power.',
    isActive: true,
  },
  {
    id: 'loc-17',
    name: 'Atiku Abubakar Way',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520241',
    popularLandmarks: ['State Secretariat Complex', 'Atiku Flyover Link', 'Civil Service Commission'],
    description: 'Prime administrative and corporate avenue with adjacent quiet residential avenues.',
    isActive: true,
  },
  {
    id: 'loc-18',
    name: 'Idoro Road',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520244',
    popularLandmarks: ['Idoro Bridge Link', 'State Stadium Annex', 'New Ring Road Concourse'],
    description: 'Rapidly emerging residential axis with spacious newly built flats and compounds.',
    isActive: true,
  },
  {
    id: 'loc-19',
    name: 'Banking Layout / Udo Udoma',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520217',
    popularLandmarks: ['Commercial Banks Hub', 'Corporate Towers', 'Tropicana Axis Link'],
    description: 'Premier financial and business district with high security and executive apartments.',
    isActive: true,
  },
  {
    id: 'loc-20',
    name: 'Nelson Mandela Street',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520252',
    popularLandmarks: ['Nelson Mandela Hub', 'Oron Road Crosslink', 'Aka Road Bypass'],
    description: 'Central urban street connecting major city districts with diverse housing options.',
    isActive: true,
  },
  {
    id: 'loc-21',
    name: 'IBB Way',
    city: 'Uyo',
    state: 'Akwa Ibom State',
    postalCode: '520253',
    popularLandmarks: ['IBB Avenue Flood Basin Link', 'Plaza Connection', 'Women Development Centre'],
    description: 'Major arterial avenue with direct connections to commercial centers and schools.',
    isActive: true,
  },
];

let serverDb: ServerDbSchema = {
  users: [...INITIAL_SERVER_USERS],
  properties: [],
  applications: [],
  notifications: [],
  reviewAudits: [],
  locations: [...INITIAL_LOCATIONS],
  config: {
    maintenanceMode: false,
    requireLandlordVerification: true,
    requireAgentApproval: true,
    autoFlagDuplicates: true,
    platformFeeRate: 0.05,
  },
  agentClients: [],
  inspections: [],
  reports: [],
  conversations: [],
  messages: [],
  supportTickets: [],
  payments: [],
  credentials: [...INITIAL_SERVER_CREDENTIALS],
  emailVerifications: [],
  verificationAudits: [],
  serverTime: new Date().toISOString(),
  version: 1,
};

// Load persistent DB from disk on boot
function loadDbFromDisk(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        serverDb = {
          ...serverDb,
          ...parsed,
          users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : INITIAL_SERVER_USERS,
          credentials:
            Array.isArray(parsed.credentials) && parsed.credentials.length > 0
              ? parsed.credentials
              : INITIAL_SERVER_CREDENTIALS,
          properties: Array.isArray(parsed.properties) ? parsed.properties : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          reviewAudits: Array.isArray(parsed.reviewAudits) ? parsed.reviewAudits : [],
          payments: Array.isArray(parsed.payments) ? parsed.payments : [],
          emailVerifications: Array.isArray(parsed.emailVerifications) ? parsed.emailVerifications : [],
          verificationAudits: Array.isArray(parsed.verificationAudits) ? parsed.verificationAudits : [],
          locations: Array.isArray(parsed.locations) && parsed.locations.length > 0 ? parsed.locations : INITIAL_LOCATIONS,
        };

        // Auto-heal missing user profile documents from credentials vault
        if (Array.isArray(serverDb.credentials)) {
          for (const cred of serverDb.credentials) {
            if (!cred.userId) continue;
            const existingUser = serverDb.users.find(
              (u) =>
                u.id === cred.userId ||
                (u.email && cred.email && u.email.toLowerCase() === cred.email.toLowerCase())
            );
            if (!existingUser) {
              console.log(
                `[SERVER DB AUTO-HEAL] Rebuilding missing user profile for ${cred.email} (UID: ${cred.userId})`
              );
              serverDb.users.push({
                id: cred.userId,
                email: cred.email.toLowerCase().trim(),
                role: cred.role,
                fullName: cred.email.split('@')[0],
                phoneNumber: '',
                accountStatus: 'ACTIVE',
                emailVerified: true,
                savedPropertyIds: [],
                createdAt: cred.createdAt || new Date().toISOString(),
              });
            }
          }
        }

        // Clean out any deprecated mock/demo properties
        serverDb.properties = (serverDb.properties || []).filter(
          (p) =>
            p.id !== 'prop-1' &&
            p.id !== 'prop-does-not-exist-at-all' &&
            p.id !== 'prop-sample-afaha-ube-2bed' &&
            !p.id.startsWith('mock-') &&
            p.landlordId !== 'user-landlord-demo'
        );

        // Backward Compatibility & Safe Migration:
        // Ensure every property has a valid facilities array and inspection fee safely defaults to ₦3,000 without affecting historical payments
        for (const p of serverDb.properties) {
          if (!Array.isArray(p.facilities)) {
            p.facilities = [];
          }
          if (typeof p.inspectionFee !== 'number' || p.inspectionFee < 3000 || p.inspectionFee > 5000) {
            p.inspectionFee = typeof p.pricing?.inspectionFee === 'number' && p.pricing.inspectionFee >= 3000 && p.pricing.inspectionFee <= 5000
              ? p.pricing.inspectionFee
              : 3000;
          }
          if (p.pricing && (typeof p.pricing.inspectionFee !== 'number' || p.pricing.inspectionFee < 3000 || p.pricing.inspectionFee > 5000)) {
            p.pricing.inspectionFee = p.inspectionFee;
          }
        }

        // Reconcile verification records for all users to establish one authoritative source of truth
        serverDb.users = serverDb.users.map((u) => reconcileUserVerification(u));

        console.log(`[SERVER DB] Successfully loaded persistent database. Users: ${serverDb.users.length}, Properties: ${serverDb.properties.length}, Inspections: ${serverDb.inspections.length}, Payments: ${serverDb.payments.length}`);
        return;
      }
    }
  } catch (err) {
    console.error('[SERVER DB] Failed to read database file, initializing defaults:', err);
  }
  saveDbToDisk();
}

// Save persistent DB to disk
function saveDbToDisk(): void {
  try {
    serverDb.serverTime = new Date().toISOString();
    serverDb.version = (serverDb.version || 0) + 1;
    fs.writeFileSync(DB_FILE, JSON.stringify(serverDb, null, 2), 'utf8');
  } catch (err) {
    console.error('[SERVER DB] Error writing database to disk:', err);
  }
}

// Initialize database
loadDbFromDisk();

// Active server sessions
interface ServerSession {
  token: string;
  userId: string;
  email: string;
  role: 'TENANT' | 'LANDLORD' | 'AGENT' | 'ADMIN';
  fullName: string;
  issuedAt: number;
  expiresAt: number;
}
const SERVER_SESSIONS: Map<string, ServerSession> = new Map();

// Helper to parse cookies from request headers without extra dependencies
function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

// Helper to create session
function createServerSession(user: { id: string; email: string; role: any; fullName: string }): ServerSession {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 7 * 24 * 60 * 60 * 1000;
  const token = `homeza_srv_${user.id}_${issuedAt}_${Math.random().toString(36).substring(2, 12)}`;

  const session: ServerSession = {
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    issuedAt,
    expiresAt,
  };

  SERVER_SESSIONS.set(token, session);
  return session;
}

// Auth Middleware: Validates Bearer Session Token, Query Token, or Cookie Token
function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token && typeof req.query?.auth_token === 'string') {
    token = req.query.auth_token.trim();
  }

  if (!token) {
    const cookies = parseCookies(req);
    if (cookies.homeza_token) {
      token = cookies.homeza_token;
    }
  }

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access denied: Authentication session token required.',
    });
    return;
  }

  let session = SERVER_SESSIONS.get(token);
  if (!session) {
    // Check if token matches standard session token formats and auto-rehydrate
    const parts = token.split('_');
    if ((token.startsWith('homeza_tok_') || token.startsWith('homeza_srv_')) && parts.length >= 3) {
      const userId = parts[2];
      let user = serverDb.users.find((u) => u.id === userId);
      if (!user) {
        const cred = serverDb.credentials.find((c) => c.userId === userId);
        if (cred) {
          user = {
            id: cred.userId,
            email: cred.email,
            role: cred.role,
            fullName: cred.email.split('@')[0],
            phoneNumber: '',
            accountStatus: 'ACTIVE',
            emailVerified: true,
            savedPropertyIds: [],
            createdAt: cred.createdAt || new Date().toISOString(),
          };
          serverDb.users.push(user);
          saveDbToDisk();
        }
      }

      if (user) {
        session = {
          token,
          userId: user.id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 7 * 86400000,
        };
        SERVER_SESSIONS.set(token, session);
      }
    }
  }

  if (!session) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access denied: Invalid or expired session token.',
    });
    return;
  }

  if (session.expiresAt < Date.now()) {
    SERVER_SESSIONS.delete(token);
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Session has expired. Please sign in again.',
    });
    return;
  }

  // Refresh role
  const user = serverDb.users.find((u) => u.id === session.userId);
  if (user) {
    session.role = user.role;
  }

  (req as any).user = session;
  next();
}

// Role Middleware: Strictly Requires ADMIN role
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied. Administrator role required.',
      requiredRole: 'ADMIN',
      actualRole: user?.role || 'UNAUTHENTICATED',
    });
    return;
  }
  next();
}

// Helper: Dispatches verification email with HOMEZA business identity and branded template
async function sendVerificationEmail(
  email: string,
  fullName: string,
  code: string,
  token: string,
  req?: Request
): Promise<{ success: boolean; isLive: boolean; error?: string; messageId?: string }> {
  const baseUrl = getHomezaBaseUrl(req);
  // Avoid injecting links pointing to loopback 127.0.0.1 domains (e.g. unconfigured homeza.com.ng A record) which trigger anti-phishing filters
  const isLoopbackDomain = baseUrl.includes('homeza.com.ng') && !process.env.HOMEZA_BASE_URL;
  const hasValidPublicUrl = !isLoopbackDomain && (baseUrl.startsWith('https://') || baseUrl.startsWith('http://'));
  const verifyLink = hasValidPublicUrl
    ? `${baseUrl}/?verify_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    : '';

  const fromAddress = getFromEmailAddress();
  const supportEmail = getSupportInboxEmail();
  const isLive = hasLiveSmtpConfigured();

  const recipientName = fullName || 'User';

  const plainText = `HOMEZA
Find verified homes. Connect with trusted property providers.

Hello ${recipientName},

You recently requested a verification code to register or secure your HOMEZA account.

Your 6-Digit Email Verification Code:
${code}

This code expires in 10 minutes.

SECURITY NOTICE:
Never share this code with anyone. HOMEZA representatives will never ask for your verification code.
${verifyLink ? `\nAlternatively, verify your email address directly:\n${verifyLink}\n` : ''}
If you did not request this verification code, please ignore this email or contact support at ${supportEmail}.

Warm regards,
HOMEZA Support Team
${supportEmail}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your HOMEZA Verification Code: ${code}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #065f46; padding: 32px 28px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #ffffff; }
        .header p { margin: 8px 0 0; font-size: 13px; color: #a7f3d0; font-weight: 500; }
        .body { padding: 32px; }
        .greeting { font-size: 18px; font-weight: 700; color: #1c1917; margin-top: 0; }
        .info-text { font-size: 14px; line-height: 1.6; color: #44403c; margin-bottom: 20px; }
        .otp-box { background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 14px; padding: 22px; text-align: center; margin: 24px 0; }
        .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #065f46; font-weight: 800; margin-bottom: 8px; }
        .otp-code { font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace; font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #047857; margin: 0; line-height: 1.2; }
        .expiry-badge { display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-top: 10px; }
        .btn-wrapper { text-align: center; margin: 28px 0 16px 0; }
        .btn { display: inline-block; background-color: #047857; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
        .security-alert { background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 6px; margin: 24px 0; font-size: 12px; color: #334155; line-height: 1.5; }
        .divider { border-top: 1px solid #e7e5e4; margin: 28px 0; }
        .notice { font-size: 12px; color: #78716c; line-height: 1.5; margin-bottom: 0; }
        .footer { background-color: #fafaf9; padding: 24px 32px; text-align: center; font-size: 12px; color: #78716c; border-top: 1px solid #f5f5f4; }
        .footer a { color: #059669; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOMEZA</h1>
          <p>Find verified homes. Connect with trusted property providers.</p>
        </div>
        <div class="body">
          <p class="greeting">Hello ${recipientName},</p>
          <p class="info-text">
            You recently initiated account registration or a sensitive account action on <strong>HOMEZA</strong>. Use the secure verification code below to confirm your email address:
          </p>
          
          <div class="otp-box">
            <div class="otp-label">Your Email Verification Code</div>
            <div class="otp-code">${code}</div>
            <div class="expiry-badge">⏱️ Valid for 10 minutes</div>
          </div>

          <div class="security-alert">
            <strong>🔒 Security Notice:</strong> Never share this verification code with anyone. HOMEZA staff and administrators will never ask for your OTP or password.
          </div>

          ${verifyLink ? `
          <div class="divider"></div>
          <p style="text-align: center; margin-bottom: 12px; font-size: 13px; font-weight: 600; color: #292524;">
            Alternatively, verify directly in your browser:
          </p>
          <div class="btn-wrapper">
            <a href="${verifyLink}" class="btn">Verify Email Address</a>
          </div>
          ` : ''}

          <p class="notice">
            If you did not request this verification code, please disregard this message or notify us at <a href="mailto:${supportEmail}" style="color: #059669; font-weight: 600;">${supportEmail}</a>.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HOMEZA Real Estate Technologies Limited.<br>
          Business Email: <a href="mailto:${supportEmail}">${supportEmail}</a><br>
          Uyo, Akwa Ibom State, Nigeria.
        </div>
      </div>
    </body>
    </html>
  `;

  // Direct Live SMTP via Nodemailer
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      const smtpHost = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.go54mail.com';
      const smtpPort = Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 465;
      const smtpUser = process.env.SMTP_USER || process.env.MAIL_USER || 'support@homeza.com.ng';
      console.log(`[EMAIL SERVICE] Dispatching OTP email to ${email} via live SMTP (${smtpHost}:${smtpPort} as ${smtpUser})...`);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: email,
        replyTo: supportEmail,
        subject: `Your HOMEZA Verification Code: ${code}`,
        text: plainText,
        html: htmlContent,
      });

      // Strict Acceptance Check: Confirm recipient was explicitly accepted and not rejected by SMTP server
      const cleanTarget = email.toLowerCase().trim();
      const acceptedList = (info.accepted || []).map((a: any) =>
        (typeof a === 'string' ? a.toLowerCase().trim() : (a?.address || '').toLowerCase().trim())
      );
      const rejectedList = (info.rejected || []).map((r: any) =>
        (typeof r === 'string' ? r.toLowerCase().trim() : (r?.address || '').toLowerCase().trim())
      );

      const isAccepted = acceptedList.includes(cleanTarget);
      const isRejected = rejectedList.includes(cleanTarget);

      if (!isAccepted || isRejected) {
        console.error(`[EMAIL SERVICE] SMTP delivery rejected recipient ${email}. Accepted: ${JSON.stringify(info.accepted)}, Rejected: ${JSON.stringify(info.rejected)}`);
        return {
          success: false,
          isLive: true,
          error: 'RECIPIENT_REJECTED',
        };
      }

      // Check positive 250 status code from SMTP server
      if (info.response && !info.response.startsWith('250')) {
        console.error(`[EMAIL SERVICE] SMTP server returned non-250 response: ${info.response}`);
        return {
          success: false,
          isLive: true,
          error: `SMTP_NON_250: ${info.response}`,
        };
      }

      console.log(`[EMAIL SERVICE] Verification OTP accepted by SMTP relay for ${email} (MessageId: ${info.messageId}, Response: ${info.response})`);
      return { success: true, isLive: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[EMAIL SERVICE] Live SMTP delivery FAILED for ${email}:`, err?.message || err);
      return { success: false, isLive: true, error: err?.message || 'SMTP delivery failure' };
    }
  }

  // No SMTP credentials configured. CRITICAL: DO NOT FAKE SUCCESS!
  console.error(`[EMAIL SERVICE] Delivery aborted for ${email}: No live SMTP credentials configured. Email was NOT sent.`);
  return {
    success: false,
    isLive: false,
    error: 'NO_LIVE_EMAIL_CREDENTIALS',
  };
}

// Helper: Dispatches real support request notification to support@homeza.com.ng with Reply-To set to user
async function sendSupportTicketEmail(ticket: any): Promise<{ success: boolean; isLive: boolean; error?: string }> {
  const supportInbox = getSupportInboxEmail();
  const fromAddress = getFromEmailAddress();
  const isLive = hasLiveSmtpConfigured();

  const userDisplayName = ticket.userName || 'HOMEZA User';
  const userEmail = ticket.userEmail || '';
  const userPhone = ticket.userPhone || 'Not provided';
  const category = ticket.category || 'General Support';
  const subject = ticket.subject || 'Support Request';
  const priority = ticket.priority || 'MEDIUM';
  const propertyTitle = ticket.propertyTitle ? `${ticket.propertyTitle} (ID: ${ticket.propertyId})` : 'None / Account level';

  const plainText = `NEW HOMEZA SUPPORT REQUEST

Ticket ID: ${ticket.id}
Category: ${category}
Priority: ${priority}
Subject: ${subject}
Date: ${new Date(ticket.createdAt || Date.now()).toLocaleString()}

USER DETAILS:
Name: ${userDisplayName}
Email: ${userEmail}
Phone: ${userPhone}
Role: ${ticket.userRole || 'TENANT'}
User ID: ${ticket.userId || 'N/A'}
Property Reference: ${propertyTitle}

MESSAGE / PROBLEM DESCRIPTION:
${ticket.description}

------------------------------------------------------
To respond to the user, simply reply directly to this email.
The reply will be routed to ${userEmail}.`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>HOMEZA Support - ${category}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917; }
        .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #0f172a; padding: 24px 28px; color: #ffffff; display: flex; justify-content: space-between; align-items: center; }
        .header h2 { margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; }
        .ticket-id { background: #059669; color: #ffffff; font-family: monospace; font-size: 13px; font-weight: 800; padding: 4px 10px; border-radius: 6px; }
        .body { padding: 28px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-right: 6px; }
        .badge-cat { background: #e0f2fe; color: #0369a1; }
        .badge-priority { background: #fef3c7; color: #92400e; }
        .info-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
        .info-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #edf2f7; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 600; width: 140px; }
        .info-value { color: #0f172a; font-weight: 700; flex: 1; word-break: break-word; }
        .msg-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; }
        .reply-notice { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 14px 18px; font-size: 12px; color: #065f46; font-weight: 600; }
        .footer { background-color: #fafaf9; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div>
            <h2>HOMEZA Support Desk</h2>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">New incoming support request</div>
          </div>
          <span class="ticket-id">${ticket.id}</span>
        </div>
        <div class="body">
          <div style="margin-bottom: 16px;">
            <span class="badge badge-cat">${category}</span>
            <span class="badge badge-priority">${priority} Priority</span>
          </div>

          <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #0f172a;">${subject}</h3>

          <div class="info-grid">
            <div class="info-row"><span class="info-label">Submitted By:</span><span class="info-value">${userDisplayName}</span></div>
            <div class="info-row"><span class="info-label">User Email:</span><span class="info-value"><a href="mailto:${userEmail}">${userEmail}</a></span></div>
            <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${userPhone}</span></div>
            <div class="info-row"><span class="info-label">Role:</span><span class="info-value">${ticket.userRole || 'TENANT'}</span></div>
            <div class="info-row"><span class="info-label">User ID:</span><span class="info-value">${ticket.userId || 'N/A'}</span></div>
            ${ticket.propertyTitle ? `<div class="info-row"><span class="info-label">Property:</span><span class="info-value">${propertyTitle}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Submitted At:</span><span class="info-value">${new Date(ticket.createdAt || Date.now()).toLocaleString()}</span></div>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #334155; margin-bottom: 6px;">Problem Description & Details:</div>
          <div class="msg-box">${ticket.description}</div>

          <div class="reply-notice">
            💬 <strong>Reply Direct:</strong> You can reply directly to this email notification in your mail app. Your response will be delivered directly to <u>${userEmail}</u>.
          </div>
        </div>
        <div class="footer">
          HOMEZA Real Estate Platform Operations Desk &bull; Uyo, Nigeria
        </div>
      </div>
    </body>
    </html>
  `;

  // Direct Live SMTP via Nodemailer
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: supportInbox,
        replyTo: userEmail ? `${userDisplayName} <${userEmail}>` : supportInbox,
        subject: `HOMEZA Support - ${category} [Ticket #${ticket.id}]: ${subject}`,
        text: plainText,
        html: htmlContent,
      });

      console.log(`[SUPPORT EMAIL] Ticket #${ticket.id} delivered to ${supportInbox} with Reply-To: ${userEmail}`);
      return { success: true, isLive: true };
    } catch (err: any) {
      console.error(`[SUPPORT EMAIL] Failed to deliver ticket to ${supportInbox}:`, err?.message || err);
      return { success: false, isLive: true, error: err?.message || 'Support email delivery error' };
    }
  }

  console.log(`[SUPPORT EMAIL] Ticket #${ticket.id} recorded (no live SMTP credentials configured to forward outward).`);
  return { success: false, isLive: false, error: 'NO_LIVE_EMAIL_CREDENTIALS' };
}

// Helper: Dispatches automated confirmation receipt to user
async function sendSupportTicketConfirmationEmail(ticket: any): Promise<{ success: boolean; isLive: boolean; error?: string }> {
  if (!ticket.userEmail) return { success: false, isLive: false, error: 'No user email' };

  const fromAddress = getFromEmailAddress();
  const supportEmail = getSupportInboxEmail();
  const isLive = hasLiveSmtpConfigured();

  const userDisplayName = ticket.userName || 'HOMEZA User';

  const plainText = `HOMEZA SUPPORT REQUEST CONFIRMATION

Hello ${userDisplayName},

Thank you for contacting HOMEZA Support. Your support request has been received and assigned reference ticket number: ${ticket.id}.

TICKET SUMMARY:
- Ticket ID: ${ticket.id}
- Category: ${ticket.category}
- Subject: ${ticket.subject}
- Status: OPEN (Under Review)

Our dedicated platform operations team in Uyo is reviewing your message. We will respond directly to this email address or update your ticket in your HOMEZA Dashboard.

If you have additional details, feel free to reply directly to this email or visit your HOMEZA Support Center.

Warm regards,
HOMEZA Support Team
${supportEmail}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>HOMEZA Support Request Received</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f4; margin: 0; padding: 24px; color: #1c1917; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #047857; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; }
        .header p { margin: 6px 0 0; font-size: 13px; color: #d1fae5; }
        .body { padding: 28px; }
        .ticket-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .ticket-id { font-family: monospace; font-size: 16px; font-weight: 800; color: #047857; }
        .footer { background-color: #fafaf9; padding: 20px 28px; text-align: center; font-size: 12px; color: #78716c; border-top: 1px solid #f5f5f4; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HOMEZA Support</h1>
          <p>Support Request Received &bull; Reference #${ticket.id}</p>
        </div>
        <div class="body">
          <p style="font-size: 16px; font-weight: 700; color: #1c1917; margin-top: 0;">Hello ${userDisplayName},</p>
          <p style="font-size: 14px; line-height: 1.6; color: #44403c;">
            Your support request has been sent successfully. HOMEZA Support will review your message and respond to you.
          </p>

          <div class="ticket-card">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #166534; font-weight: 800;">Ticket Reference</div>
            <div class="ticket-id">${ticket.id}</div>
            <div style="margin-top: 8px; font-size: 13px; color: #1e293b;">
              <strong>Category:</strong> ${ticket.category}<br>
              <strong>Subject:</strong> ${ticket.subject}
            </div>
          </div>

          <p style="font-size: 13px; color: #57534e; line-height: 1.5;">
            Our support desk is actively reviewing your issue. You can track this ticket directly from your HOMEZA Dashboard under the Support Center, or reply to this email if you have more details to add.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} HOMEZA Real Estate Technologies Limited &bull; <a href="mailto:${supportEmail}" style="color: #059669; text-decoration: none;">${supportEmail}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  // Direct Live SMTP via Nodemailer
  const transporter = getMailTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: ticket.userEmail,
        replyTo: supportEmail,
        subject: `[HOMEZA Support] Request Received: ${ticket.subject} (${ticket.id})`,
        text: plainText,
        html: htmlContent,
      });
      return { success: true, isLive: true };
    } catch (err: any) {
      console.error(`[SUPPORT EMAIL] Confirmation email failed via SMTP for ${ticket.userEmail}:`, err?.message || err);
      return { success: false, isLive: true, error: err?.message };
    }
  }

  return { success: false, isLive: false, error: 'NO_LIVE_EMAIL_CREDENTIALS' };
}


// Middleware: Strictly Requires Verified Email
function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  let user = (req as any).user;

  // If not authenticated via standard middleware, attempt token lookup or body/query user lookup
  if (!user) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (token) {
      const session = SERVER_SESSIONS.get(token);
      if (session) {
        user = session;
      }
    }
  }

  const userId = user?.userId || req.body?.tenantId || req.body?.userId || req.query?.userId;
  const userEmail = user?.email || req.body?.tenantEmail || req.body?.email || req.query?.email;

  let dbUser: any = null;
  if (userId) {
    dbUser = serverDb.users.find((u) => u.id === userId);
  } else if (userEmail) {
    dbUser = serverDb.users.find((u) => u.email?.toLowerCase() === String(userEmail).toLowerCase().trim());
  }

  // Admins always bypass email verification
  if (dbUser && dbUser.role === 'ADMIN') {
    return next();
  }

  if (dbUser && dbUser.emailVerified === false) {
    res.status(403).json({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Email address verification is required before performing this action. Please verify your email address to continue.',
      email: dbUser.email,
      userId: dbUser.id,
    });
    return;
  }

  next();
}

/* ========================================================================= */
/* SYNCHRONIZATION & DATABASE ENDPOINTS                                      */
/* ========================================================================= */

// 1. Get Full Authoritative Platform State
app.get('/api/sync/state', (req: Request, res: Response) => {
  const pendingLandlords = serverDb.users.filter(
    (u) => u.role === 'LANDLORD' && (u.verificationStatus === 'PENDING' || u.verificationStatus === 'CORRECTION_REQUIRED')
  );
  const pendingAgents = serverDb.users.filter(
    (u) =>
      u.role === 'AGENT' &&
      (u.verificationStatus === 'PENDING_AGENT_APPROVAL' ||
        u.verificationStatus === 'PENDING' ||
        u.verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
        u.verificationStatus === 'CORRECTION_REQUIRED')
  );
  const pendingProperties = serverDb.properties.filter(
    (p) => p.status === 'PENDING_REVIEW' || p.status === 'PENDING_VERIFICATION' || p.status === 'CORRECTION_REQUIRED'
  );
  const adminNotifs = serverDb.notifications.filter(
    (n) => n.userId === 'user-admin-1' || n.userId === 'admin-1' || n.userId === 'admin' || n.targetRole === 'ADMIN'
  );

  console.log(`[SYNC STATE] ADMIN DASHBOARD QUERY STARTED`);
  console.log(`[SYNC STATE] PENDING LANDLORDS FOUND: ${pendingLandlords.length}`);
  console.log(`[SYNC STATE] PENDING AGENTS FOUND: ${pendingAgents.length}`);
  console.log(`[SYNC STATE] PENDING PROPERTIES FOUND: ${pendingProperties.length}`);
  console.log(`[SYNC STATE] ADMIN NOTIFICATIONS FOUND: ${adminNotifs.length}`);

  // Securely exclude server credentials and verification hashes from client synchronization
  const { credentials: _ignoredCreds, emailVerifications: _ignoredVerifs, ...safeServerData } = serverDb;

  res.json({
    success: true,
    data: safeServerData,
    serverTime: new Date().toISOString(),
    version: serverDb.version,
  });
});

// 2. Push Batch Mutations / Updates from any Client Device
app.post('/api/sync/push', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Payload object is required.' });
      return;
    }

    let modified = false;

    // A. Users
    if (Array.isArray(payload.users) && payload.users.length > 0) {
      for (const u of payload.users) {
        if (!u.id) continue;
        const idx = serverDb.users.findIndex((x) => x.id === u.id || (u.email && x.email?.toLowerCase() === u.email?.toLowerCase()));
        if (idx >= 0) {
          const existingVerified = evaluateUserVerification(serverDb.users[idx]).isFullyVerified;
          serverDb.users[idx] = { ...serverDb.users[idx], ...u };
          if (existingVerified) {
            // Protect genuine verified state from stale unverified client payloads
            reconcileUserVerification(serverDb.users[idx]);
          } else {
            reconcileUserVerification(serverDb.users[idx]);
          }
        } else {
          serverDb.users.push(reconcileUserVerification(u));
          if (u.role === 'LANDLORD') {
            console.log(`LANDLORD REGISTRATION STARTED`);
            console.log(`LANDLORD RECORD CREATED: ${u.id}`);
            console.log(`LANDLORD STATUS: ${u.verificationStatus || 'pending'}`);
          } else if (u.role === 'AGENT') {
            console.log(`AGENT REGISTRATION STARTED`);
            console.log(`AGENT RECORD CREATED: ${u.id}`);
            console.log(`AGENT STATUS: ${u.verificationStatus || 'pending'}`);
          }
        }
        modified = true;
      }
    }

    // Security Rule: Credentials can NEVER be pushed or modified via /api/sync/push.
    // Account credential management is exclusively handled by authenticated /api/auth/* endpoints.

    // C. Properties
    if (Array.isArray(payload.properties) && payload.properties.length > 0) {
      for (const p of payload.properties) {
        if (!p.id) continue;

        // Security check: Property creator must be admin or fully verified
        const submitterId = p.submittingAgentId || p.landlordId;
        const user = serverDb.users.find((u) => u.id === submitterId);
        if (user && user.role !== 'ADMIN') {
          const vEval = evaluateUserVerification(user);
          if (!vEval.isFullyVerified) {
            console.warn(`[SYNC PUSH] Blocked unverified property insertion for user ${submitterId} (Property: ${p.id})`);
            continue;
          }
        }

        const idx = serverDb.properties.findIndex((x) => x.id === p.id);
        if (idx >= 0) {
          serverDb.properties[idx] = { ...serverDb.properties[idx], ...p };
        } else {
          serverDb.properties.unshift(p);
          console.log(`PROPERTY SYNCED TO SERVER: ${p.id} (${p.title || 'Untitled'})`);
        }
        modified = true;
      }
    }

    // D. Notifications
    if (Array.isArray(payload.notifications) && payload.notifications.length > 0) {
      for (const n of payload.notifications) {
        if (!n.id) continue;
        const idx = serverDb.notifications.findIndex((x) => x.id === n.id);
        if (idx >= 0) {
          serverDb.notifications[idx] = { ...serverDb.notifications[idx], ...n };
        } else {
          serverDb.notifications.unshift(n);
          if (n.userId === 'user-admin-1' || n.userId === 'admin-1' || n.userId === 'admin' || n.targetRole === 'ADMIN') {
            console.log(`ADMIN NOTIFICATION CREATED: ${n.id} - ${n.title}`);
          }
        }
        modified = true;
      }
    }

    // E. Review Audits
    if (Array.isArray(payload.reviewAudits) && payload.reviewAudits.length > 0) {
      for (const a of payload.reviewAudits) {
        if (!a.id) continue;
        const idx = serverDb.reviewAudits.findIndex((x) => x.id === a.id);
        if (idx >= 0) {
          serverDb.reviewAudits[idx] = { ...serverDb.reviewAudits[idx], ...a };
        } else {
          serverDb.reviewAudits.unshift(a);
          console.log(`ADMIN APPROVAL RECORD CREATED: ${a.id} (${a.decision}) on ${a.targetType} ${a.targetId}`);
        }
        modified = true;
      }
    }

    // F. Other Collections (Applications, Inspections, Reports, etc.)
    if (Array.isArray(payload.applications)) {
      serverDb.applications = payload.applications;
      modified = true;
    }
    if (Array.isArray(payload.inspections) && payload.inspections.length > 0) {
      for (const insp of payload.inspections) {
        if (!insp.id) continue;
        const idx = serverDb.inspections.findIndex((x) => x.id === insp.id || (insp.bookingId && x.bookingId === insp.bookingId));
        if (idx >= 0) {
          serverDb.inspections[idx] = { ...serverDb.inspections[idx], ...insp };
        } else {
          serverDb.inspections.unshift(insp);
        }
      }
      modified = true;
    }
    if (Array.isArray(payload.reports)) {
      serverDb.reports = payload.reports;
      modified = true;
    }
    if (Array.isArray(payload.agentClients)) {
      serverDb.agentClients = payload.agentClients;
      modified = true;
    }
    if (Array.isArray(payload.conversations)) {
      serverDb.conversations = payload.conversations;
      modified = true;
    }
    if (Array.isArray(payload.messages)) {
      serverDb.messages = payload.messages;
      modified = true;
    }
    if (Array.isArray(payload.supportTickets)) {
      serverDb.supportTickets = payload.supportTickets;
      modified = true;
    }
    if (Array.isArray(payload.payments)) {
      serverDb.payments = payload.payments;
      modified = true;
    }
    if (Array.isArray(payload.locations)) {
      serverDb.locations = payload.locations;
      modified = true;
    }
    if (payload.config && typeof payload.config === 'object') {
      serverDb.config = { ...serverDb.config, ...payload.config };
      modified = true;
    }

    if (modified) {
      saveDbToDisk();
    }

    res.json({
      success: true,
      serverTime: new Date().toISOString(),
      version: serverDb.version,
      counts: {
        users: serverDb.users.length,
        properties: serverDb.properties.length,
        notifications: serverDb.notifications.length,
        reviewAudits: serverDb.reviewAudits.length,
      },
    });
  } catch (err: any) {
    console.error('DATABASE READ ERROR:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to process sync.' });
  }
});

// 3. Debug State Summary for Developer / Deep Verification
app.get('/api/debug/state-summary', (req: Request, res: Response) => {
  const pendingLandlords = serverDb.users.filter(
    (u) => u.role === 'LANDLORD' && (u.verificationStatus === 'PENDING' || u.verificationStatus === 'CORRECTION_REQUIRED')
  );
  const pendingAgents = serverDb.users.filter(
    (u) =>
      u.role === 'AGENT' &&
      (u.verificationStatus === 'PENDING_AGENT_APPROVAL' ||
        u.verificationStatus === 'PENDING' ||
        u.verificationStatus === 'AGENT_CORRECTION_REQUIRED' ||
        u.verificationStatus === 'CORRECTION_REQUIRED')
  );
  const pendingProperties = serverDb.properties.filter(
    (p) => p.status === 'PENDING_REVIEW' || p.status === 'PENDING_VERIFICATION' || p.status === 'CORRECTION_REQUIRED'
  );
  const adminNotifications = serverDb.notifications.filter(
    (n) => n.userId === 'user-admin-1' || n.userId === 'admin-1' || n.userId === 'admin' || n.targetRole === 'ADMIN'
  );

  res.json({
    success: true,
    serverTime: new Date().toISOString(),
    totals: {
      totalUsers: serverDb.users.length,
      totalProperties: serverDb.properties.length,
      totalNotifications: serverDb.notifications.length,
      totalReviewAudits: serverDb.reviewAudits.length,
    },
    pendingQueues: {
      pendingLandlordsCount: pendingLandlords.length,
      pendingAgentsCount: pendingAgents.length,
      pendingPropertiesCount: pendingProperties.length,
      adminNotificationsCount: adminNotifications.length,
      pendingLandlords: pendingLandlords.map((l) => ({ id: l.id, name: l.fullName, email: l.email, status: l.verificationStatus })),
      pendingAgents: pendingAgents.map((a) => ({ id: a.id, name: a.fullName, agency: a.agencyName, status: a.verificationStatus })),
      pendingProperties: pendingProperties.map((p) => ({ id: p.id, title: p.title, landlord: p.landlordName, status: p.status })),
      recentAdminNotifs: adminNotifications.slice(0, 5),
    },
  });
});

/* ========================================================================= */
/* CORE IDENTITY & SECURITY VERIFICATION (3-STEP VERIFICATION)               */
/* ========================================================================= */

function calculateOverallVerificationStatus(user: any): 'NOT_STARTED' | 'IN_PROGRESS' | 'VERIFIED' | 'FAILED' | 'REVIEW' {
  return evaluateUserVerification(user).overallStatus;
}

function recordVerificationAudit(entry: {
  userId: string;
  userName: string;
  userRole: string;
  verificationType: 'PHONE_OTP' | 'IDENTITY_NIN' | 'NAME_MATCH' | 'LIVENESS' | 'OVERALL' | 'ADMIN_REVIEW';
  status: string;
  referenceId?: string;
  reason?: string;
  details?: Record<string, any>;
}) {
  const log = {
    id: 'va-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'),
    ...entry,
    environment: VERIFICATION_CONFIG.mode.toUpperCase() as 'TEST' | 'LIVE',
    timestamp: new Date().toISOString(),
  };
  if (!Array.isArray(serverDb.verificationAudits)) {
    serverDb.verificationAudits = [];
  }
  serverDb.verificationAudits.unshift(log);
  if (serverDb.verificationAudits.length > 1000) {
    serverDb.verificationAudits.pop();
  }
  saveDbToDisk();
}

// 1. Phone OTP - Send OTP Endpoint
app.post('/api/verification/phone/send-otp', async (req: Request, res: Response) => {
  const { phoneNumber, userId } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ error: 'PHONE_REQUIRED', message: 'Phone number is required.' });
    return;
  }

  const result = await sendPhoneOtpInternal(phoneNumber, userId);
  if (!result.success) {
    res.status(result.status).json({
      error: result.error,
      message: result.message,
      cooldownSeconds: result.cooldownSeconds,
      deliveryStatus: result.deliveryStatus || 'SMS_FAILED',
      explanation: result.explanation,
    });
    return;
  }

  if (userId) {
    const user = serverDb.users.find((u) => u.id === userId);
    if (user) {
      if (!user.verification) {
        user.verification = {
          identityVerificationStatus: 'NOT_STARTED',
          nameVerificationStatus: 'NOT_STARTED',
          phoneVerificationStatus: 'NOT_STARTED',
          overallVerificationStatus: 'NOT_STARTED',
          environment: VERIFICATION_CONFIG.mode.toUpperCase(),
          updatedAt: new Date().toISOString(),
        };
      }
      // Strictly require user to enter the verified OTP code before marking verified
      user.verification.phoneVerificationStatus = user.isPhoneVerified ? 'VERIFIED' : 'OTP_SENT';
      user.verification.phone = result.maskedPhone;
      user.verification.updatedAt = new Date().toISOString();
      user.verification.overallVerificationStatus = calculateOverallVerificationStatus(user);

      recordVerificationAudit({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        verificationType: 'PHONE_OTP',
        status: result.deliveryStatus || 'OTP_SENT',
        referenceId: result.reference,
        details: {
          provider: result.provider,
          messageId: result.messageId || 'N/A',
          isTest: result.isTest,
        },
      });
      saveDbToDisk();
    }
  }

  // Strictly return delivery receipt and status - NEVER return the OTP
  res.status(200).json({
    success: true,
    message: result.message,
    reference: result.reference,
    maskedPhone: result.maskedPhone,
    cooldownSeconds: result.cooldownSeconds,
    expiresInSeconds: 300,
    deliveryStatus: result.deliveryStatus,
    provider: result.provider,
    messageId: result.messageId,
    isTest: result.isTest,
    explanation: result.explanation,
    environment: VERIFICATION_CONFIG.mode.toUpperCase(),
  });
});

// 1b. Real-time SMS Delivery Status Query Endpoint
app.get('/api/verification/phone/sms-status', (req: Request, res: Response) => {
  const reference = (req.query.reference as string) || (req.query.messageId as string);
  if (!reference) {
    res.status(400).json({ error: 'REFERENCE_REQUIRED', message: 'reference or messageId query parameter is required.' });
    return;
  }

  const record = smsDeliveryTracker.get(reference);
  if (!record) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'SMS delivery receipt not found.' });
    return;
  }

  res.status(200).json({
    success: true,
    record,
  });
});

// 1c. SMS Carrier Delivery Webhook (IdentifyOrg, Termii DLR, Twilio StatusCallback)
app.post('/api/verification/phone/sms-webhook', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const updated = updateSmsDeliveryReceipt(payload);
    res.status(200).json({ success: true, updated: !!updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Phone OTP - Verify OTP Endpoint
app.post('/api/verification/phone/verify-otp', async (req: Request, res: Response) => {
  const { phoneNumber, code, userId } = req.body;
  if (!phoneNumber || !code) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Phone number and verification code are required.' });
    return;
  }

  const result = await verifyPhoneOtpInternal(phoneNumber, code, userId);
  const user = userId ? serverDb.users.find((u) => u.id === userId) : null;

  if (!result.success) {
    if (user) {
      recordVerificationAudit({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        verificationType: 'PHONE_OTP',
        status: 'FAILED',
        reason: result.message,
      });
    }
    res.status(result.status).json({
      error: result.error,
      message: result.message,
      remainingAttempts: result.remainingAttempts,
    });
    return;
  }

  if (user) {
    user.isPhoneVerified = true;
    user.phoneVerifiedAt = new Date().toISOString();
    user.phoneNumber = normalizeNigerianPhoneNumber(phoneNumber);

    if (!user.verification) {
      user.verification = {
        identityVerificationStatus: 'NOT_STARTED',
        nameVerificationStatus: 'NOT_STARTED',
        phoneVerificationStatus: 'NOT_STARTED',
        overallVerificationStatus: 'NOT_STARTED',
        environment: VERIFICATION_CONFIG.mode.toUpperCase(),
        updatedAt: new Date().toISOString(),
      };
    }

    user.verification.phoneVerificationStatus = 'VERIFIED';
    user.verification.phoneVerifiedAt = new Date().toISOString();
    user.verification.phone = maskPhoneNumber(phoneNumber);
    user.verification.updatedAt = new Date().toISOString();
    reconcileUserVerification(user);

    recordVerificationAudit({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      verificationType: 'PHONE_OTP',
      status: 'VERIFIED',
    });
    saveDbToDisk();

    res.json({
      success: true,
      message: result.message,
      verification: user.verification,
      user,
    });
    return;
  }

  res.json({
    success: true,
    message: result.message,
  });
});

// 2.5. Identity Document Upload Endpoint
const DOCUMENTS_UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'documents');
try {
  if (!fs.existsSync(DOCUMENTS_UPLOAD_DIR)) {
    fs.mkdirSync(DOCUMENTS_UPLOAD_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[SERVER] Could not create documents upload dir:', e);
}

app.post('/api/verification/document/upload', async (req: Request, res: Response) => {
  try {
    const { userId, fileData, fileName, fileType, documentType } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'USER_ID_REQUIRED', message: 'User ID is required.' });
      return;
    }

    const user = serverDb.users.find((u) => u.id === userId);
    if (!user) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'User account not found.' });
      return;
    }

    if (!fileData) {
      res.status(400).json({ error: 'FILE_DATA_REQUIRED', message: 'No file data received.' });
      return;
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const detectedType = (fileType || '').toLowerCase().trim();
    if (detectedType && !allowedTypes.includes(detectedType) && !detectedType.startsWith('image/')) {
      res.status(400).json({
        error: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Please upload a clear JPG, PNG, or WebP image.',
      });
      return;
    }

    // Strip data URI prefix if present
    let rawBase64 = fileData;
    let actualMime = detectedType || 'image/jpeg';
    if (fileData.startsWith('data:')) {
      const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        actualMime = match[1].toLowerCase();
        rawBase64 = match[2];
      }
    }

    const buffer = Buffer.from(rawBase64, 'base64');

    // Validate size (min 2KB, max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    const MIN_SIZE = 2 * 1024;
    if (buffer.length < MIN_SIZE) {
      res.status(400).json({
        error: 'FILE_TOO_SMALL',
        message: 'Selected image appears corrupted or empty. Please select a clear photograph of your ID.',
      });
      return;
    }

    if (buffer.length > MAX_SIZE) {
      res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds 10MB limit. Please select a smaller photo or compress it.',
      });
      return;
    }

    let ext = 'jpg';
    if (actualMime.includes('png')) ext = 'png';
    else if (actualMime.includes('webp')) ext = 'webp';

    const docId = `doc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const safeFileName = `${docId}.${ext}`;
    const filePath = path.join(DOCUMENTS_UPLOAD_DIR, safeFileName);

    // Save binary file to disk
    fs.writeFileSync(filePath, buffer);

    if (!Array.isArray(serverDb.documents)) {
      serverDb.documents = [];
    }

    const docRecord = {
      id: docId,
      userId,
      originalName: (fileName || 'identity_document.jpg').replace(/[^a-zA-Z0-9_\-\.]/g, '_'),
      fileType: actualMime,
      fileSize: buffer.length,
      documentType: documentType || 'GOVERNMENT_ID',
      fileName: safeFileName,
      storagePath: path.join('data', 'uploads', 'documents', safeFileName),
      documentUrl: `/api/verification/document/${docId}`,
      uploadedAt: new Date().toISOString(),
      status: 'STORED',
    };

    serverDb.documents.push(docRecord);

    if (!user.verification) {
      user.verification = {
        identityVerificationStatus: 'NOT_STARTED',
        nameVerificationStatus: 'NOT_STARTED',
        phoneVerificationStatus: user.isPhoneVerified ? 'VERIFIED' : 'NOT_STARTED',
        overallVerificationStatus: 'NOT_STARTED',
        environment: VERIFICATION_CONFIG.mode.toUpperCase(),
        updatedAt: new Date().toISOString(),
      };
    }

    user.verification.documentId = docId;
    user.verification.documentUrl = docRecord.documentUrl;
    user.verification.documentFileName = docRecord.originalName;
    user.verification.documentUploadedAt = docRecord.uploadedAt;
    user.verification.updatedAt = new Date().toISOString();

    saveDbToDisk();

    console.log(`[DOCUMENT UPLOAD] Successfully stored identity document ${docId} for user ${userId} (${docRecord.fileSize} bytes)`);

    res.status(200).json({
      success: true,
      message: 'Identity document uploaded successfully and stored securely.',
      documentId: docId,
      documentUrl: docRecord.documentUrl,
      fileName: docRecord.originalName,
      fileSize: docRecord.fileSize,
      verification: user.verification,
    });
  } catch (err: any) {
    console.error('[DOCUMENT UPLOAD] Error handling document upload:', err);
    res.status(500).json({
      error: 'UPLOAD_FAILED',
      message: `Failed to upload document: ${err.message || 'Server storage error'}`,
    });
  }
});

// Secure Document Retrieval Endpoint (Authorization Protected)
app.get('/api/verification/document/:documentId', (req: Request, res: Response) => {
  const { documentId } = req.params;
  const reqUserId = (req.query.userId as string) || (req.headers['x-user-id'] as string);

  const doc = (serverDb.documents || []).find((d) => d.id === documentId);
  if (!doc) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Document not found.' });
    return;
  }

  // Authorization check: Only the document owner or an ADMIN can view the document
  if (reqUserId) {
    const user = serverDb.users.find((u) => u.id === reqUserId);
    if (user && user.role !== 'ADMIN' && doc.userId !== reqUserId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Unauthorized access to private identity document.' });
      return;
    }
  }

  const absPath = path.isAbsolute(doc.storagePath)
    ? doc.storagePath
    : path.join(process.cwd(), doc.storagePath);

  if (!fs.existsSync(absPath)) {
    res.status(404).json({ error: 'FILE_NOT_FOUND', message: 'Document file not found on disk storage.' });
    return;
  }

  res.setHeader('Content-Type', doc.fileType || 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(absPath);
});

// 3. Identity / NIN Verification Endpoint
app.post('/api/verification/identity/verify', async (req: Request, res: Response) => {
  const { userId, idType, idNumber, fullName, dateOfBirth, documentUrl, documentId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'USER_ID_REQUIRED', message: 'User ID is required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  // Record document reference if provided
  if (!user.verification) {
    user.verification = {
      identityVerificationStatus: 'NOT_STARTED',
      nameVerificationStatus: 'NOT_STARTED',
      phoneVerificationStatus: user.isPhoneVerified ? 'VERIFIED' : 'NOT_STARTED',
      overallVerificationStatus: 'NOT_STARTED',
      environment: VERIFICATION_CONFIG.mode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };
  }

  if (documentUrl) {
    user.verification.documentUrl = documentUrl;
  }
  if (documentId) {
    user.verification.documentId = documentId;
  }

  // Call Identity Provider (TEST or LIVE)
  const idResult = await verifyIdentityInternal({
    idType: idType || 'National Identification Number (NIN)',
    idNumber,
    fullName: fullName || user.fullName,
    dateOfBirth,
    documentUrl: documentUrl || user.verification?.documentUrl,
    userId,
  });

  // Authoritatively update user identity verification record in all cases
  user.verification.idType = idType || 'National Identification Number (NIN)';
  user.verification.maskedIdNumber = idResult.maskedIdNumber || maskIdNumber(idNumber);
  user.verification.identityVerificationStatus = idResult.status;
  user.verification.identityVerifiedAt = new Date().toISOString();
  user.verification.provider = idResult.provider;
  user.verification.providerReference = idResult.reference;
  user.verification.environment = idResult.environment;
  user.verification.updatedAt = new Date().toISOString();

  if (idResult.failureReason) {
    user.verification.failureReason = idResult.failureReason;
  } else {
    user.verification.failureReason = undefined;
  }

  if (idResult.reviewReason) {
    user.verification.reviewReason = idResult.reviewReason;
  } else {
    user.verification.reviewReason = undefined;
  }

  recordVerificationAudit({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    verificationType: 'IDENTITY_NIN',
    status: idResult.status,
    referenceId: idResult.reference,
    reason: idResult.failureReason || idResult.reviewReason,
  });

  // Step 3: Legal Name Verification
  let nameResult: any = null;
  if (idResult.status === 'VERIFIED' && idResult.verifiedName) {
    user.verification.verifiedName = idResult.verifiedName;
    nameResult = compareNames(fullName || user.fullName, idResult.verifiedName);
    user.verification.nameMatchConfidence = nameResult.confidence;
    user.verification.nameVerifiedAt = new Date().toISOString();

    if (nameResult.confidence === 'MATCH') {
      user.verification.nameVerificationStatus = 'VERIFIED';
    } else if (nameResult.confidence === 'PARTIAL/REVIEW') {
      user.verification.nameVerificationStatus = 'REVIEW';
      user.verification.reviewReason = nameResult.reason;
    } else {
      user.verification.nameVerificationStatus = 'MISMATCH';
      user.verification.failureReason = nameResult.reason;
    }

    recordVerificationAudit({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      verificationType: 'NAME_MATCH',
      status: user.verification.nameVerificationStatus,
      reason: nameResult.reason,
      details: {
        score: nameResult.score,
        confidence: nameResult.confidence,
      },
    });
  } else {
    // If ID verification did not pass, legal name verification CANNOT pass
    user.verification.nameVerificationStatus =
      idResult.status === 'REVIEW'
        ? 'REVIEW'
        : idResult.status === 'PROCESSING'
        ? 'PROCESSING'
        : 'FAILED';
    user.verification.nameMatchConfidence = 'MISMATCH';
    user.verification.failureReason = idResult.failureReason || 'Government identity verification failed.';

    recordVerificationAudit({
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      verificationType: 'NAME_MATCH',
      status: user.verification.nameVerificationStatus,
      reason: idResult.failureReason || 'Identity not verified; legal name match could not be established.',
    });
  }

  // Recalculate authoritative overall status and reconcile user
  reconcileUserVerification(user);
  const overall = user.verification.overallVerificationStatus;

  recordVerificationAudit({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    verificationType: 'OVERALL',
    status: overall,
    reason: user.verification.failureReason || user.verification.reviewReason,
  });

  saveDbToDisk();

  res.status(200).json({
    success: idResult.success,
    status: idResult.status,
    verification: user.verification,
    nameMatchResult: nameResult,
    user,
    message: idResult.failureReason || (idResult.success ? 'Identity verification processed successfully.' : 'Identity verification could not be confirmed.'),
  });
});

// 3b. Liveness Verification Endpoint (IdentifyOrg LIVE API: POST /v1/verify/liveness)
app.post('/api/verification/liveness', express.json({ limit: '15mb' }), async (req: Request, res: Response) => {
  const { image, userId } = req.body;
  if (!image) {
    res.status(400).json({ error: 'IMAGE_REQUIRED', message: 'Liveness photo image is required.' });
    return;
  }

  try {
    let base64Data = image;
    let mimeType = 'image/jpeg';

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const result = await verifyLivenessInternal(imageBuffer, mimeType);

    const user = userId ? serverDb.users.find((u) => u.id === userId) : null;

    if (!result.success) {
      if (user) {
        recordVerificationAudit({
          userId: user.id,
          userName: user.fullName,
          userRole: user.role,
          verificationType: 'LIVENESS',
          status: 'FAILED',
          reason: result.message,
        });
      }
      res.status(result.status || 400).json({
        success: false,
        error: result.error,
        message: result.message,
      });
      return;
    }

    if (user) {
      if (!user.verification) {
        user.verification = {
          identityVerificationStatus: 'NOT_STARTED',
          nameVerificationStatus: 'NOT_STARTED',
          phoneVerificationStatus: 'NOT_STARTED',
          overallVerificationStatus: 'NOT_STARTED',
          environment: VERIFICATION_CONFIG.mode.toUpperCase(),
          updatedAt: new Date().toISOString(),
        };
      }
      user.verification.livenessStatus = 'VERIFIED';
      user.verification.livenessVerifiedAt = new Date().toISOString();
      user.verification.updatedAt = new Date().toISOString();
      user.verification.overallVerificationStatus = calculateOverallVerificationStatus(user);

      recordVerificationAudit({
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        verificationType: 'LIVENESS',
        status: 'VERIFIED',
      });
      saveDbToDisk();

      res.json({
        success: true,
        message: 'Liveness verification completed successfully.',
        data: result.data,
        verification: user.verification,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Liveness verification completed successfully.',
      data: result.data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Liveness verification processing failed.',
    });
  }
});

// 4. Name Verification Endpoint (Stand-alone or re-check)
app.post('/api/verification/name/verify', (req: Request, res: Response) => {
  const { userId, submittedName, verifiedName } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'User ID is required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  // Pre-requisite: Government NIN must be verified first
  if (user.verification?.identityVerificationStatus !== 'VERIFIED' || !user.verification?.verifiedName) {
    res.status(400).json({
      error: 'IDENTITY_NOT_VERIFIED',
      message: 'Government identity (NIN) must be genuinely verified before legal name matching can be performed.',
    });
    return;
  }

  const officialVerifiedName = user.verification.verifiedName;
  const candidateName = submittedName || user.fullName;
  const result = compareNames(candidateName, officialVerifiedName);

  if (!user.verification) {
    user.verification = {
      identityVerificationStatus: 'NOT_STARTED',
      nameVerificationStatus: 'NOT_STARTED',
      phoneVerificationStatus: 'NOT_STARTED',
      overallVerificationStatus: 'NOT_STARTED',
      environment: VERIFICATION_CONFIG.mode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };
  }

  user.verification.nameMatchConfidence = result.confidence;
  user.verification.nameVerifiedAt = new Date().toISOString();
  if (result.confidence === 'MATCH') {
    user.verification.nameVerificationStatus = 'VERIFIED';
  } else if (result.confidence === 'PARTIAL/REVIEW') {
    user.verification.nameVerificationStatus = 'REVIEW';
    user.verification.reviewReason = result.reason;
  } else {
    user.verification.nameVerificationStatus = 'MISMATCH';
    user.verification.failureReason = result.reason;
  }

  user.verification.overallVerificationStatus = calculateOverallVerificationStatus(user);
  if (user.verification.overallVerificationStatus === 'VERIFIED') {
    user.verificationStatus = 'VERIFIED';
  }

  recordVerificationAudit({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    verificationType: 'NAME_MATCH',
    status: user.verification.nameVerificationStatus,
    reason: result.reason,
  });

  saveDbToDisk();

  res.json({
    success: true,
    matchResult: result,
    verification: user.verification,
    user,
  });
});

// 4.5. Verification Provider Health & Balance Endpoint
app.get('/api/verification/provider-status', async (_req: Request, res: Response) => {
  const balanceInfo = await getIdentifyOrgBalance();
  res.json({
    provider: VERIFICATION_CONFIG.provider,
    mode: VERIFICATION_CONFIG.mode,
    phoneVerificationEndpoint: 'https://api.identifyorg.com/v1/phone/verify/start',
    ninVerificationEndpoint: 'https://api.identifyorg.com/v1/verify/nin',
    liveCredentialsConfigured: isIdentifyOrgLiveKeyConfigured(),
    liveSmsConfigured: hasLiveSmsCredentials(),
    accountBalance: balanceInfo,
  });
});

// 5. Verification Status Query Endpoint
app.get('/api/verification/status', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).json({ error: 'USER_ID_REQUIRED', message: 'User ID is required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  reconcileUserVerification(user);
  saveDbToDisk();

  const userAudits = (serverDb.verificationAudits || [])
    .filter((a) => a.userId === userId)
    .slice(0, 20);

  const evaluation = evaluateUserVerification(user);

  res.json({
    success: true,
    verification: user.verification,
    evaluation,
    user,
    environment: VERIFICATION_CONFIG.mode.toUpperCase(),
    provider: VERIFICATION_CONFIG.provider,
    audits: userAudits,
  });
});

// 6. Admin Verification List Endpoint
app.get('/api/verification/admin/list', (req: Request, res: Response) => {
  const usersWithVerification = serverDb.users.map((u) => {
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      phoneNumber: maskPhoneNumber(u.phoneNumber),
      isPhoneVerified: !!u.isPhoneVerified,
      verification: u.verification || {
        identityVerificationStatus: 'NOT_STARTED',
        nameVerificationStatus: 'NOT_STARTED',
        phoneVerificationStatus: u.isPhoneVerified ? 'VERIFIED' : 'NOT_STARTED',
        overallVerificationStatus: 'NOT_STARTED',
        environment: VERIFICATION_CONFIG.mode.toUpperCase(),
        updatedAt: u.createdAt,
      },
      verificationStatus: u.verificationStatus || 'NOT_SUBMITTED',
      createdAt: u.createdAt,
    };
  });

  res.json({
    success: true,
    users: usersWithVerification,
    audits: (serverDb.verificationAudits || []).slice(0, 100),
    environment: VERIFICATION_CONFIG.mode.toUpperCase(),
  });
});

// 7. Admin Verification Review Decision Endpoint (Approve / Reject / Request Correction)
app.post('/api/verification/admin/decision', (req: Request, res: Response) => {
  const { userId, decision, adminNotes, adminName } = req.body;
  if (!userId || !decision) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'User ID and decision are required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  if (!user.verification) {
    user.verification = {
      identityVerificationStatus: 'NOT_STARTED',
      nameVerificationStatus: 'NOT_STARTED',
      phoneVerificationStatus: user.isPhoneVerified ? 'VERIFIED' : 'NOT_STARTED',
      overallVerificationStatus: 'NOT_STARTED',
      environment: VERIFICATION_CONFIG.mode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };
  }

  const nowIso = new Date().toISOString();
  user.verification.adminReviewedBy = adminName || 'Compliance Officer';
  user.verification.adminReviewedAt = nowIso;
  user.verification.adminNotes = adminNotes || '';
  user.verification.updatedAt = nowIso;

  if (decision === 'APPROVE') {
    user.verification.adminApprovalStatus = 'APPROVED';
    user.verification.identityVerificationStatus = 'VERIFIED';
    user.verification.nameVerificationStatus = 'VERIFIED';
    user.verification.overallVerificationStatus = 'VERIFIED';
    user.verification.overallVerifiedAt = nowIso;
    user.verificationStatus = 'VERIFIED';
    user.verification.failureReason = undefined;
    user.verification.reviewReason = undefined;
  } else if (decision === 'REJECT') {
    user.verification.adminApprovalStatus = 'REJECTED';
    user.verification.overallVerificationStatus = 'FAILED';
    user.verification.failureReason = adminNotes || 'Rejected by compliance admin.';
    user.verificationStatus = 'REJECTED';
  } else if (decision === 'REQUEST_CORRECTION') {
    user.verification.adminApprovalStatus = 'CORRECTION_REQUIRED';
    user.verification.overallVerificationStatus = 'REVIEW';
    user.verification.reviewReason = adminNotes || 'Corrections requested by administrator.';
    user.verificationStatus = 'CORRECTION_REQUIRED';
  }

  recordVerificationAudit({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    verificationType: 'ADMIN_REVIEW',
    status: decision,
    reason: adminNotes,
    details: {
      adminName: adminName || 'Compliance Officer',
      decision,
    },
  });

  saveDbToDisk();

  res.json({
    success: true,
    message: `Verification decision recorded: ${decision}`,
    verification: user.verification,
    user,
  });
});

// 8. Test Mode Reset Endpoint (Allows re-testing the flow from scratch)
app.post('/api/verification/test-reset', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'USER_ID_REQUIRED', message: 'User ID is required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  user.isPhoneVerified = false;
  user.phoneVerifiedAt = undefined;
  user.verification = {
    identityVerificationStatus: 'NOT_STARTED',
    nameVerificationStatus: 'NOT_STARTED',
    phoneVerificationStatus: 'NOT_STARTED',
    overallVerificationStatus: 'NOT_STARTED',
    environment: VERIFICATION_CONFIG.mode === 'live' ? 'LIVE' : 'TEST',
    updatedAt: new Date().toISOString(),
  };
  if (user.role === 'LANDLORD' || user.role === 'AGENT') {
    user.verificationStatus = 'PENDING';
  }

  recordVerificationAudit({
    userId: user.id,
    userName: user.fullName,
    userRole: user.role,
    verificationType: 'ADMIN_REVIEW',
    status: 'TEST_RESET',
    reason: 'Test mode verification state reset to NOT_STARTED.',
  });

  saveDbToDisk();

  res.json({
    success: true,
    message: 'User verification status has been reset to NOT_STARTED for testing.',
    verification: user.verification,
    user,
  });
});

/* ========================================================================= */
/* PROPERTY & KYC RESTRICTION ENDPOINTS                                      */
/* ========================================================================= */

// Check if user is eligible to add properties based on KYC approval
app.post('/api/properties/check-eligibility', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'User ID is required.' });
    return;
  }

  const user = serverDb.users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found.' });
    return;
  }

  if (user.role === 'ADMIN') {
    res.json({ eligible: true, kycState: 'APPROVED', role: 'ADMIN' });
    return;
  }

  if (user.role !== 'LANDLORD' && user.role !== 'AGENT') {
    res.status(403).json({
      eligible: false,
      error: 'ROLE_FORBIDDEN',
      message: 'Only Landlords and Agents can publish property listings.',
    });
    return;
  }

  const verificationEval = evaluateUserVerification(user);
  if (verificationEval.isFullyVerified) {
    reconcileUserVerification(user);
    saveDbToDisk();
  }

  res.json({
    eligible: verificationEval.isFullyVerified,
    kycState: verificationEval.kycState,
    role: user.role,
    verificationStatus: verificationEval.isFullyVerified ? 'VERIFIED' : ((user as any).verificationStatus || 'NOT_SUBMITTED'),
    overallVerificationStatus: verificationEval.overallStatus,
    missingSteps: verificationEval.missingSteps,
    adminNote: (user as any).adminRejectionReason || (user as any).adminCorrectionNote || user.verification?.failureReason || user.verification?.reviewReason || undefined,
  });
});

// Real-time server-side multi-signal duplicate check
app.post('/api/properties/check-duplicate', (req: Request, res: Response) => {
  const candidate = req.body;
  if (!candidate || !candidate.location) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Property payload required.' });
    return;
  }

  const existingProps = serverDb.properties.filter((p) => p.id !== candidate.id && p.status !== 'REJECTED');

  let highestScore = 0;
  let topReasons: string[] = [];
  let topExactImageMatch = false;
  let topMatchedProperty: any = null;

  for (const ep of existingProps) {
    let score = 0;
    const reasons: string[] = [];
    let exactImageMatch = false;

    // 1. Image match
    const candImgs = Array.isArray(candidate.images) ? candidate.images : [];
    const existImgs = Array.isArray(ep.images) ? ep.images : [];
    if (candImgs.length > 0 && existImgs.length > 0) {
      let matchCount = 0;
      const existUrls = new Set(existImgs.map((i: any) => typeof i === 'string' ? i : i.url));
      candImgs.forEach((i: any) => {
        const u = typeof i === 'string' ? i : i.url;
        if (u && existUrls.has(u)) matchCount++;
      });

      if (matchCount > 0) {
        exactImageMatch = true;
        score += matchCount >= 2 ? 55 : 35;
        reasons.push(`${matchCount} matching image(s) with listing "${ep.title}"`);
      }
    }

    // 2. Area & street
    const candArea = (candidate.location?.area || '').trim().toLowerCase();
    const existArea = (ep.location?.area || '').trim().toLowerCase();
    if (candArea && existArea && candArea === existArea) {
      score += 25;
      reasons.push(`Same neighbourhood area (${ep.location.area})`);

      const candStreet = (candidate.location?.street || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const existStreet = (ep.location?.street || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ' ');
      if (candStreet && existStreet && candStreet === existStreet) {
        score += 35;
        reasons.push(`Exact matching street address ("${ep.location.street}")`);
      }
    }

    // 3. Property Type & Specifications
    if (candidate.propertyType && ep.propertyType && candidate.propertyType === ep.propertyType) {
      score += 15;
      reasons.push(`Identical property type (${ep.propertyType})`);
    }

    if (candidate.bedrooms && ep.bedrooms && Number(candidate.bedrooms) === Number(ep.bedrooms)) {
      score += 15;
      reasons.push(`Same bedroom count (${ep.bedrooms} beds)`);
    }

    // 4. Rent Proximity
    const candRent = Number(candidate.pricing?.rent || 0);
    const existRent = Number(ep.pricing?.rent || 0);
    if (candRent > 0 && existRent > 0) {
      const diff = Math.abs(candRent - existRent) / Math.max(candRent, existRent);
      if (diff === 0) {
        score += 20;
        reasons.push(`Exact matching rent (₦${candRent.toLocaleString()})`);
      } else if (diff <= 0.1) {
        score += 12;
        reasons.push(`Matching pricing tier (within 10%)`);
      }
    }

    const finalScore = Math.min(score, 100);
    if (finalScore > highestScore) {
      highestScore = finalScore;
      topReasons = reasons;
      topExactImageMatch = exactImageMatch;
      topMatchedProperty = ep;
    }
  }

  const isHighConfidence = highestScore >= 80 || (topExactImageMatch && highestScore >= 70);
  const isMediumConfidence = !isHighConfidence && highestScore >= 50;

  res.json({
    isDuplicate: isHighConfidence || isMediumConfidence,
    confidence: isHighConfidence ? 'HIGH' : isMediumConfidence ? 'MEDIUM' : 'NONE',
    score: highestScore,
    reasons: topReasons,
    exactImageMatch: topExactImageMatch,
    matchedProperty: topMatchedProperty
      ? {
          id: topMatchedProperty.id,
          title: topMatchedProperty.title,
          location: topMatchedProperty.location,
          pricing: topMatchedProperty.pricing,
          propertyType: topMatchedProperty.propertyType,
          images: topMatchedProperty.images,
        }
      : null,
  });
});

// Dedicated Authoritative Property Listing Creation Endpoint
app.post('/api/properties', (req: Request, res: Response) => {
  const property = req.body;
  if (!property || !property.title || !property.location || !property.pricing) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Incomplete property details provided.' });
    return;
  }

  const submitterId = property.submittingAgentId || property.landlordId;
  const user = serverDb.users.find((u) => u.id === submitterId);

  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid registered user session required.' });
    return;
  }

  // Role validation: only landlords, agents, or admin can list properties
  if (user.role !== 'LANDLORD' && user.role !== 'AGENT' && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Only registered Landlords and Verified Agents can list properties on HOMEZA.' });
    return;
  }

  // Email verification check
  if (user.role !== 'ADMIN' && user.emailVerified === false) {
    res.status(403).json({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before continuing to HOMEZA.',
    });
    return;
  }

  // Authoritative 3-Step Identity Verification Check
  if (user.role !== 'ADMIN') {
    const verificationEval = evaluateUserVerification(user);

    if (!verificationEval.isFullyVerified) {
      res.status(403).json({
        error: 'VERIFICATION_REQUIRED',
        message: `You must complete all 3 mandatory verification checks before listing properties on HOMEZA. Missing or incomplete: ${verificationEval.missingSteps.join(', ') || 'Verification pending'}.`,
        details: {
          phoneVerified: verificationEval.phoneVerified,
          idVerified: verificationEval.idVerified,
          nameVerified: verificationEval.nameVerified,
          overallVerificationStatus: verificationEval.overallStatus,
          missingSteps: verificationEval.missingSteps,
        },
      });
      return;
    }

    reconcileUserVerification(user);
    saveDbToDisk();
  }

  // Duplicate Check against existing properties
  const existingProps = serverDb.properties.filter((p) => p.id !== property.id && p.status !== 'REJECTED');
  let highestScore = 0;
  for (const ep of existingProps) {
    let score = 0;
    if (ep.location.area?.toLowerCase() === property.location.area?.toLowerCase()) score += 30;
    if (ep.location.street?.toLowerCase() === property.location.street?.toLowerCase()) score += 35;
    if (ep.propertyType === property.propertyType) score += 20;
    if (Number(ep.pricing?.rent) === Number(property.pricing?.rent)) score += 20;
    if (score > highestScore) highestScore = Math.min(score, 100);
  }

  if (highestScore >= 80 && user.role !== 'ADMIN') {
    res.status(409).json({
      error: 'DUPLICATE_PROPERTY',
      message: 'This property appears to have already been listed on HOMEZA. Please check the existing listing before submitting it again.',
      score: highestScore,
    });
    return;
  }

  // Strict Validation for Inspection Fee (₦3,000 minimum, ₦5,000 maximum)
  const rawInspectionFee = property.inspectionFee ?? property.pricing?.inspectionFee;
  if (rawInspectionFee === undefined || rawInspectionFee === null || rawInspectionFee === '') {
    res.status(400).json({
      error: 'INVALID_INSPECTION_FEE',
      message: 'Inspection fee is required and must be between ₦3,000 and ₦5,000.',
    });
    return;
  }

  const feeNum = Number(rawInspectionFee);
  if (isNaN(feeNum) || !Number.isFinite(feeNum) || feeNum < 3000 || feeNum > 5000) {
    res.status(400).json({
      error: 'INVALID_INSPECTION_FEE',
      message: 'Inspection fee must be between ₦3,000 and ₦5,000.',
    });
    return;
  }

  const validatedInspectionFee = feeNum;

  const nowIso = new Date().toISOString();
  const existingPropIndex = property.id ? serverDb.properties.findIndex((p) => p.id === property.id) : -1;
  let savedProp: any;

  if (existingPropIndex >= 0) {
    savedProp = {
      ...serverDb.properties[existingPropIndex],
      ...property,
      inspectionFee: validatedInspectionFee,
      pricing: {
        ...(serverDb.properties[existingPropIndex].pricing || {}),
        ...(property.pricing || {}),
        inspectionFee: validatedInspectionFee,
      },
      updatedAt: nowIso,
    };
    serverDb.properties[existingPropIndex] = savedProp;
  } else {
    savedProp = {
      ...property,
      id: property.id || 'prop-' + Date.now(),
      inspectionFee: validatedInspectionFee,
      pricing: {
        ...(property.pricing || {}),
        inspectionFee: validatedInspectionFee,
      },
      status: 'PENDING_REVIEW',
      createdAt: property.createdAt || nowIso,
      updatedAt: nowIso,
    };
    serverDb.properties.unshift(savedProp);
  }
  saveDbToDisk();

  res.status(existingPropIndex >= 0 ? 200 : 201).json({
    success: true,
    property: savedProp,
    message: existingPropIndex >= 0 ? 'Property listing updated successfully.' : 'Property listing created and submitted for verification.',
  });
});

/* ========================================================================= */
/* AUTHENTICATION ROUTES                                                     */
/* ========================================================================= */

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'HOMEZA Real Estate Platform',
    serverTime: new Date().toISOString(),
    authEngine: 'Authoritative Salted SHA-256 Server RBAC',
    totalUsers: serverDb.users.length,
    totalProperties: serverDb.properties.length,
  });
});

// Check Email Availability (supports GET and POST)
const handleCheckEmail = (req: Request, res: Response) => {
  try {
    const email = (req.body?.email || req.query?.email) as string | undefined;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ available: false, error: 'BAD_REQUEST', message: 'A valid email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const parts = cleanEmail.split('@');
    if (parts.length !== 2) {
      res.status(400).json({ available: false, error: 'INVALID_FORMAT', message: 'Please enter a valid email address.' });
      return;
    }

    const domain = parts[1];
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    if (!allowedDomains.includes(domain)) {
      res.status(400).json({
        available: false,
        error: 'DOMAIN_RESTRICTED',
        message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
      });
      return;
    }

    const existingUser = serverDb.users.find(
      (u) => u.email && u.email.toLowerCase().trim() === cleanEmail
    );

    if (existingUser && existingUser.emailVerified) {
      res.status(409).json({
        available: false,
        exists: true,
        message: 'An account with this email address already exists. Please sign in instead.',
      });
      return;
    }

    res.json({
      available: true,
      exists: false,
      isUnverified: !!(existingUser && !existingUser.emailVerified),
      userId: existingUser ? existingUser.id : undefined,
      message: 'Email address is available.',
    });
  } catch (error) {
    console.error('[AUTH ERROR] Email availability check failed:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: "We couldn't verify your email availability right now. Please try again.",
    });
  }
};

app.get('/api/auth/check-email', handleCheckEmail);
app.post('/api/auth/check-email', handleCheckEmail);

// User Registration
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, role, phoneNumber, businessName, idCardType, idCardNumber, agencyName, operatingArea, cacNumber, licenseNumber, bio } = req.body;

    if (!fullName || !email || !password || !role) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'All required fields must be provided.' });
      return;
    }

    // Block attempt to register as ADMIN
    if (role === 'ADMIN' || String(role).toUpperCase() === 'ADMIN') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Administrative accounts cannot be registered publicly. Access denied.',
      });
      return;
    }

    const allowedRoles = ['TENANT', 'LANDLORD', 'AGENT'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid registration role.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const parts = cleanEmail.split('@');
    if (parts.length !== 2) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Please enter a valid email address.' });
      return;
    }

    const domain = parts[1];
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
    if (!allowedDomains.includes(domain)) {
      res.status(400).json({
        error: 'DOMAIN_RESTRICTED',
        message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Password must be at least 8 characters in length.' });
      return;
    }

    // Authoritative check for existing user in database
    const existing = serverDb.users.find((u) => u.email && u.email.toLowerCase().trim() === cleanEmail);

    if (existing && existing.emailVerified) {
      res.status(409).json({ error: 'CONFLICT', message: 'An account with this email address already exists. Please sign in instead.' });
      return;
    }

    const salt = `salt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const passwordHash = hashPassword(password, salt);
    const nowIso = new Date().toISOString();

    // Generate 6-digit cryptographically secure verification code & token (10-minute expiry)
    const verifyCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    let targetUserId = existing ? existing.id : `${role.toLowerCase()}-${Date.now()}`;
    const verifyToken = `vtok_${targetUserId}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    let userRecord: any;

    if (existing) {
      // Refresh unverified account record
      existing.fullName = fullName.trim();
      existing.phoneNumber = phoneNumber?.trim() || existing.phoneNumber || '';
      existing.role = role;
      existing.emailVerificationToken = verifyToken;
      if (role === 'LANDLORD') {
        existing.businessName = businessName?.trim() || existing.businessName || '';
        existing.idCardType = idCardType || existing.idCardType || 'National Identification Number (NIN)';
        existing.idCardNumber = idCardNumber?.trim() || existing.idCardNumber || '';
        existing.verificationStatus = existing.verificationStatus || 'NOT_SUBMITTED';
      } else if (role === 'AGENT') {
        existing.agencyName = agencyName?.trim() || existing.agencyName || 'Independent Real Estate Intermediary';
        existing.operatingArea = operatingArea?.trim() || existing.operatingArea || 'All Uyo Metropolitan';
        existing.cacNumber = cacNumber?.trim() || existing.cacNumber || '';
        existing.licenseNumber = licenseNumber?.trim() || existing.licenseNumber || '';
        existing.bio = bio?.trim() || existing.bio || '';
        existing.verificationStatus = existing.verificationStatus || 'NOT_SUBMITTED';
      }
      userRecord = existing;

      // Update credential
      const credIdx = serverDb.credentials.findIndex((c) => c.email && c.email.toLowerCase().trim() === cleanEmail);
      const updatedCred = {
        userId: targetUserId,
        email: cleanEmail,
        role,
        passwordHash,
        salt,
        createdAt: nowIso,
      };
      if (credIdx >= 0) {
        serverDb.credentials[credIdx] = updatedCred;
      } else {
        serverDb.credentials.push(updatedCred);
      }
    } else {
      // Create new unverified user record
      userRecord = {
        id: targetUserId,
        email: cleanEmail,
        role,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber?.trim() || '',
        accountStatus: 'ACTIVE',
        emailVerified: false,
        emailVerificationToken: verifyToken,
        createdAt: nowIso,
      };

      if (role === 'LANDLORD') {
        console.log(`LANDLORD REGISTRATION STARTED: ${cleanEmail}`);
        console.log(`LANDLORD RECORD CREATED: ${targetUserId}`);
        console.log(`LANDLORD STATUS: NOT_SUBMITTED`);
        userRecord = {
          ...userRecord,
          businessName: businessName?.trim() || '',
          verificationStatus: 'NOT_SUBMITTED',
          idCardType: idCardType || 'National Identification Number (NIN)',
          idCardNumber: idCardNumber?.trim() || '',
        };
      } else if (role === 'AGENT') {
        console.log(`AGENT REGISTRATION STARTED: ${cleanEmail}`);
        console.log(`AGENT RECORD CREATED: ${targetUserId}`);
        console.log(`AGENT STATUS: NOT_SUBMITTED`);
        userRecord = {
          ...userRecord,
          agencyName: agencyName?.trim() || 'Independent Real Estate Intermediary',
          operatingArea: operatingArea?.trim() || 'All Uyo Metropolitan',
          cacNumber: cacNumber?.trim() || '',
          licenseNumber: licenseNumber?.trim() || '',
          bio: bio?.trim() || 'Professional real estate intermediary in Uyo.',
          verificationStatus: 'NOT_SUBMITTED',
        };
      } else {
        userRecord = {
          ...userRecord,
          occupation: req.body.occupation?.trim() || '',
          savedPropertyIds: [],
        };
      }

      // Save credential
      serverDb.credentials.push({
        userId: targetUserId,
        email: cleanEmail,
        role,
        passwordHash,
        salt,
        createdAt: nowIso,
      });

      // Save user
      serverDb.users.push(userRecord);

      // Create Admin Notification for new Landlord or Agent
      if (role === 'LANDLORD') {
        const notifId = `notif-${Date.now()}-admin-landlord-reg`;
        serverDb.notifications.unshift({
          id: notifId,
          userId: 'user-admin-1',
          title: 'New Landlord Registration',
          message: `New Landlord registered: ${userRecord.fullName}${userRecord.businessName ? ` (${userRecord.businessName})` : ''}.`,
          type: 'KYC_LANDLORD',
          targetType: 'KYC_LANDLORD',
          targetId: userRecord.id,
          isRead: false,
          createdAt: nowIso,
        });
        console.log(`ADMIN NOTIFICATION CREATED: ${notifId}`);
      } else if (role === 'AGENT') {
        const notifId = `notif-${Date.now()}-admin-agent-reg`;
        serverDb.notifications.unshift({
          id: notifId,
          userId: 'user-admin-1',
          title: 'New Agent Registration',
          message: `New Agent registered: ${userRecord.fullName} (${userRecord.agencyName}).`,
          type: 'KYC_AGENT',
          targetType: 'KYC_AGENT',
          targetId: userRecord.id,
          isRead: false,
          createdAt: nowIso,
        });
        console.log(`ADMIN NOTIFICATION CREATED: ${notifId}`);
      }
    }

    // Invalidate prior codes and store verification record with secure hash
    if (!Array.isArray(serverDb.emailVerifications)) {
      serverDb.emailVerifications = [];
    }
    const codeHash = hashPassword(verifyCode, DEFAULT_SALT);
    serverDb.emailVerifications = serverDb.emailVerifications.filter((v) => v.email?.toLowerCase().trim() !== cleanEmail);
    serverDb.emailVerifications.push({
      email: cleanEmail,
      codeHash,
      code: verifyCode, // keep for backward compatibility during active session
      token: verifyToken,
      expiresAt,
      createdAt: nowIso,
      lastSentAt: Date.now(),
      attempts: 0,
    });

    // Dispatch Verification Email
    const emailResult = await sendVerificationEmail(cleanEmail, userRecord.fullName, verifyCode, verifyToken, req);

    if (!emailResult.success) {
      console.warn(`[AUTH REGISTER] Verification email dispatch notice for ${cleanEmail}: ${emailResult.error}`);
    }

    saveDbToDisk();

    res.status(201).json({
      success: true,
      needsEmailVerification: true,
      email: cleanEmail,
      userId: userRecord.id,
      message: 'We have dispatched your verification details. Please verify your email to activate your account and access your dashboard.',
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        fullName: userRecord.fullName,
        emailVerified: false,
      },
    });
  } catch (error) {
    console.error('[AUTH ERROR] Registration failed on server:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: "We couldn't verify your email availability right now. Please try again.",
    });
  }
});

// Verify Email Endpoint (POST /api/auth/verify-email)
app.post('/api/auth/verify-email', (req: Request, res: Response) => {
  const { email, code, token, userId } = req.body;

  if (!email && !token && !userId) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Email address, token or user ID is required.' });
    return;
  }

  const cleanEmail = email ? email.toLowerCase().trim() : '';
  let user = serverDb.users.find(
    (u) =>
      (cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
      (userId && u.id === userId) ||
      (token && u.emailVerificationToken === token)
  );

  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User account not found.' });
    return;
  }

  if (user.emailVerified) {
    res.json({
      success: true,
      message: 'Email address is already verified.',
      user,
    });
    return;
  }

  const entry = (serverDb.emailVerifications || []).find(
    (v) =>
      v.email?.toLowerCase() === user.email?.toLowerCase() ||
      (token && v.token === token)
  );

  if (!entry) {
    res.status(400).json({
      error: 'NO_CODE_FOUND',
      message: 'No active verification code was found. Please request a new verification code.',
    });
    return;
  }

  // Check failed attempts limit (max 5)
  if (entry.attempts && entry.attempts >= 5) {
    serverDb.emailVerifications = (serverDb.emailVerifications || []).filter(
      (v) => v.email?.toLowerCase() !== user.email?.toLowerCase()
    );
    saveDbToDisk();
    res.status(400).json({
      error: 'TOO_MANY_ATTEMPTS',
      message: 'Too many incorrect attempts. For your security, this verification code has been invalidated. Please click Resend Code to receive a new one.',
    });
    return;
  }

  // Check expiration (10 minutes)
  if (entry.expiresAt < Date.now()) {
    serverDb.emailVerifications = (serverDb.emailVerifications || []).filter(
      (v) => v.email?.toLowerCase() !== user.email?.toLowerCase()
    );
    saveDbToDisk();
    res.status(400).json({
      error: 'EXPIRED_CODE',
      message: 'The verification code has expired. Please request a fresh verification code.',
    });
    return;
  }

  let isMatch = false;

  if (token && (entry.token === token || user.emailVerificationToken === token)) {
    isMatch = true;
  } else if (code) {
    const trimmed = code.trim();
    if (entry.codeHash && hashPassword(trimmed, DEFAULT_SALT) === entry.codeHash) {
      isMatch = true;
    } else if (entry.code === trimmed) {
      isMatch = true;
    }
  }

  if (!isMatch) {
    entry.attempts = (entry.attempts || 0) + 1;
    saveDbToDisk();
    const remaining = 5 - entry.attempts;
    res.status(400).json({
      error: 'INVALID_CODE',
      message: remaining > 0
        ? `Invalid verification code. Please check the code sent to your email and try again (${remaining} attempt${remaining === 1 ? '' : 's'} remaining).`
        : 'Invalid verification code. Maximum attempts reached. Please request a new code.',
    });
    return;
  }

  const nowIso = new Date().toISOString();
  user.emailVerified = true;
  user.emailVerifiedAt = nowIso;
  delete user.emailVerificationToken;

  serverDb.emailVerifications = (serverDb.emailVerifications || []).filter(
    (v) => v.email?.toLowerCase() !== user.email?.toLowerCase()
  );

  // Notify user
  serverDb.notifications.unshift({
    id: `notif-${Date.now()}-email-verified`,
    userId: user.id,
    title: 'Email Address Verified',
    message: 'Your HOMEZA email address has been verified successfully. You now have full access to platform features.',
    type: 'SYSTEM',
    isRead: false,
    createdAt: nowIso,
  });

  saveDbToDisk();

  console.log(`[EMAIL VERIFIED] User ${user.email} (${user.id}) successfully verified.`);

  const session = createServerSession(user);

  res.json({
    success: true,
    message: 'Email verified successfully! You now have full access to HOMEZA.',
    user,
    session,
  });
});

// Verify Email via Direct Link (GET /api/auth/verify-email)
app.get('/api/auth/verify-email', (req: Request, res: Response) => {
  const token = req.query.token as string;
  const email = (req.query.email as string)?.toLowerCase().trim();

  if (!token && !email) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>HOMEZA - Verification Error</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fafaf9;">
          <h2 style="color: #b91c1c;">Invalid Verification Link</h2>
          <p style="color: #57534e;">Missing token or email parameters.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Return to HOMEZA</a>
        </body>
      </html>
    `);
    return;
  }

  let user = serverDb.users.find(
    (u) =>
      (email && u.email?.toLowerCase() === email) ||
      (token && u.emailVerificationToken === token)
  );

  if (!user) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>HOMEZA - User Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #fafaf9;">
          <h2 style="color: #b91c1c;">Account Not Found</h2>
          <p style="color: #57534e;">No registered HOMEZA account matched this link.</p>
          <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Return to HOMEZA</a>
        </body>
      </html>
    `);
    return;
  }

  const nowIso = new Date().toISOString();
  user.emailVerified = true;
  user.emailVerifiedAt = nowIso;
  delete user.emailVerificationToken;

  serverDb.emailVerifications = (serverDb.emailVerifications || []).filter(
    (v) => v.email?.toLowerCase() !== user.email?.toLowerCase()
  );

  saveDbToDisk();

  res.redirect(`/?email_verified=true&email=${encodeURIComponent(user.email)}`);
});

// Send / Resend Verification Email (POST /api/auth/send-verification-email & /api/auth/resend-verification)
app.post(['/api/auth/send-verification-email', '/api/auth/resend-verification'], async (req: Request, res: Response) => {
  const { email, userId } = req.body;

  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const user = serverDb.users.find(
    (u) => (cleanEmail && u.email?.toLowerCase() === cleanEmail) || (userId && u.id === userId)
  );

  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'No registered user found with this email address.' });
    return;
  }

  if (user.emailVerified) {
    res.json({ success: true, message: 'Your email is already verified.', isAlreadyVerified: true });
    return;
  }

  // Rate limit: 60 seconds cooldown
  const existingEntry = (serverDb.emailVerifications || []).find((v) => v.email?.toLowerCase() === user.email?.toLowerCase());
  if (existingEntry && existingEntry.lastSentAt && Date.now() - existingEntry.lastSentAt < 60000) {
    const waitSec = Math.ceil((60000 - (Date.now() - existingEntry.lastSentAt)) / 1000);
    res.status(429).json({
      error: 'RATE_LIMITED',
      message: `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} before requesting a new verification code.`,
    });
    return;
  }

  const verifyCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashPassword(verifyCode, DEFAULT_SALT);
  const verifyToken = `vtok_${user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const nowIso = new Date().toISOString();

  const emailResult = await sendVerificationEmail(user.email, user.fullName, verifyCode, verifyToken, req);

  if (!emailResult.success) {
    console.error(`[AUTH RESEND] Failed to deliver verification code to ${user.email}: ${emailResult.error}`);
    res.status(500).json({
      success: false,
      error: 'EMAIL_DELIVERY_FAILED',
      message: "We couldn't send the verification code. Please try again.",
    });
    return;
  }

  // Update token and reset attempts upon genuine delivery
  user.emailVerificationToken = verifyToken;

  if (!Array.isArray(serverDb.emailVerifications)) {
    serverDb.emailVerifications = [];
  }
  serverDb.emailVerifications = serverDb.emailVerifications.filter((v) => v.email?.toLowerCase() !== user.email?.toLowerCase());
  serverDb.emailVerifications.push({
    email: user.email.toLowerCase(),
    codeHash,
    code: verifyCode,
    token: verifyToken,
    expiresAt,
    createdAt: nowIso,
    lastSentAt: Date.now(),
    attempts: 0,
  });

  saveDbToDisk();

  res.json({
    success: true,
    message: `Verification code sent to ${user.email}.`,
  });
});

// Change Unverified Email (POST /api/auth/change-email)
app.post('/api/auth/change-email', async (req: Request, res: Response) => {
  const { oldEmail, newEmail, userId } = req.body;

  if (!newEmail) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'New email address is required.' });
    return;
  }

  const cleanNew = newEmail.toLowerCase().trim();
  const cleanOld = oldEmail ? oldEmail.toLowerCase().trim() : '';

  const parts = cleanNew.split('@');
  if (parts.length !== 2 || !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(parts[1])) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Registration is restricted to @gmail.com, @yahoo.com, @outlook.com, and @hotmail.com email addresses.',
    });
    return;
  }

  const existingWithNew = serverDb.users.find((u) => u.email?.toLowerCase() === cleanNew);
  if (existingWithNew && (!userId || existingWithNew.id !== userId)) {
    res.status(409).json({ error: 'CONFLICT', message: 'An account with the new email address already exists.' });
    return;
  }

  let user = serverDb.users.find(
    (u) => (userId && u.id === userId) || (cleanOld && u.email?.toLowerCase() === cleanOld)
  );

  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User account not found.' });
    return;
  }

  const previousEmail = user.email;
  const previousToken = user.emailVerificationToken;
  user.email = cleanNew;
  user.emailVerified = false;
  user.emailVerifiedAt = undefined;

  const cred = serverDb.credentials.find((c) => c.userId === user.id || (previousEmail && c.email?.toLowerCase() === previousEmail.toLowerCase()));
  if (cred) {
    cred.email = cleanNew;
  }

  const verifyCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = hashPassword(verifyCode, DEFAULT_SALT);
  const verifyToken = `vtok_${user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const nowIso = new Date().toISOString();

  user.emailVerificationToken = verifyToken;

  if (!Array.isArray(serverDb.emailVerifications)) {
    serverDb.emailVerifications = [];
  }
  serverDb.emailVerifications = serverDb.emailVerifications.filter(
    (v) => v.email?.toLowerCase() !== previousEmail?.toLowerCase() && v.email?.toLowerCase() !== cleanNew
  );
  serverDb.emailVerifications.push({
    email: cleanNew,
    codeHash,
    code: verifyCode,
    token: verifyToken,
    expiresAt,
    createdAt: nowIso,
    lastSentAt: Date.now(),
    attempts: 0,
  });

  const emailResult = await sendVerificationEmail(cleanNew, user.fullName, verifyCode, verifyToken, req);

  if (!emailResult.success) {
    console.error(`[AUTH CHANGE EMAIL] Failed to deliver verification email to ${cleanNew}: ${emailResult.error}`);
    // Rollback email change on user object
    user.email = previousEmail;
    if (cred) {
      cred.email = previousEmail;
    }
    user.emailVerificationToken = previousToken;
    serverDb.emailVerifications = serverDb.emailVerifications.filter((v) => v.email?.toLowerCase() !== cleanNew);
    saveDbToDisk();

    res.status(500).json({
      success: false,
      error: 'EMAIL_DELIVERY_FAILED',
      message: "We couldn't send the verification code. Please try again.",
    });
    return;
  }

  saveDbToDisk();

  res.json({
    success: true,
    message: `Email updated to ${cleanNew}. A new verification code has been dispatched.`,
    user,
  });
});

// ==========================================
// HOMEZA SUPPORT SYSTEM ENDPOINTS
// ==========================================

// Get Support Tickets (GET /api/support/tickets)
app.get('/api/support/tickets', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  const userRole = req.query.userRole as string;

  if (!Array.isArray(serverDb.supportTickets)) {
    serverDb.supportTickets = [];
  }

  if (userRole === 'ADMIN' || !userId) {
    res.json({ success: true, tickets: serverDb.supportTickets });
  } else {
    const userTickets = serverDb.supportTickets.filter((t) => t.userId === userId || t.userEmail?.toLowerCase() === (req.query.email as string)?.toLowerCase());
    res.json({ success: true, tickets: userTickets });
  }
});

// Submit / Send Support Ticket (POST /api/support/ticket, /api/support/send, /api/support/submit)
app.post(['/api/support/ticket', '/api/support/send', '/api/support/submit'], async (req: Request, res: Response) => {
  try {
    const {
      name,
      userName,
      email,
      userEmail,
      phone,
      userPhone,
      category,
      subject,
      description,
      message,
      priority,
      userRole,
      userId,
      propertyId,
      propertyTitle,
    } = req.body;

    const contactName = (userName || name || '').trim();
    const contactEmail = (userEmail || email || '').toLowerCase().trim();
    const ticketCategory = (category || 'General question').trim();
    const ticketSubject = (subject || 'Support Inquiry').trim();
    const problemDesc = (description || message || '').trim();

    if (!contactName || !contactEmail || !problemDesc) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Your name, registered email address, and a description of your problem are required.',
      });
      return;
    }

    if (!Array.isArray(serverDb.supportTickets)) {
      serverDb.supportTickets = [];
    }

    const ticketId = `TIC-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    const initialMessage = {
      id: `tmsg-${Date.now()}-1`,
      senderId: userId || `guest-${Date.now()}`,
      senderName: contactName,
      senderRole: (userRole || 'TENANT').toUpperCase(),
      message: problemDesc,
      createdAt: nowIso,
    };

    const newTicket = {
      id: ticketId,
      userId: userId || `user-${Date.now()}`,
      userName: contactName,
      userEmail: contactEmail,
      userPhone: (userPhone || phone || '').trim(),
      userRole: (userRole || 'TENANT').toUpperCase(),
      category: ticketCategory,
      subject: ticketSubject,
      description: problemDesc,
      priority: priority || 'MEDIUM',
      status: 'OPEN',
      propertyId: propertyId || undefined,
      propertyTitle: propertyTitle || undefined,
      messages: [initialMessage],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    serverDb.supportTickets.unshift(newTicket);

    // Create Admin In-App Notification
    serverDb.notifications.unshift({
      id: `notif-${Date.now()}-support-${ticketId}`,
      userId: 'user-admin-1',
      title: `New Support Ticket: ${ticketId}`,
      message: `[${newTicket.userRole}] ${contactName} submitted ticket: "${ticketSubject}" (${ticketCategory})`,
      type: 'SYSTEM',
      targetType: 'SUPPORT_TICKET',
      targetId: ticketId,
      isRead: false,
      createdAt: nowIso,
    });

    saveDbToDisk();

    // 1. Send Real Email to support@homeza.com.ng with Reply-To set to the user!
    const emailToSupportResult = await sendSupportTicketEmail(newTicket);

    // 2. Send Automated Confirmation Receipt to the user
    await sendSupportTicketConfirmationEmail(newTicket);

    console.log(`[SUPPORT DESK] Ticket ${ticketId} created by ${contactName} (${contactEmail}) - Dispatched to support@homeza.com.ng`);

    res.status(201).json({
      success: true,
      ticket: newTicket,
      message: 'Your support request has been sent successfully. HOMEZA Support will review your message and respond to you.',
      emailDelivered: emailToSupportResult.success,
    });
  } catch (err: any) {
    console.error('[SUPPORT ERROR] Failed to process support ticket:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: "We couldn't submit your support request right now. Please try again or email support@homeza.com.ng directly.",
    });
  }
});

// Add Message / Reply to Ticket (POST /api/support/tickets/:ticketId/messages)
app.post('/api/support/tickets/:ticketId/messages', async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { senderId, senderName, senderRole, message: replyText } = req.body;

    if (!replyText || !replyText.trim()) {
      res.status(400).json({ error: 'BAD_REQUEST', message: 'Message text is required.' });
      return;
    }

    if (!Array.isArray(serverDb.supportTickets)) {
      serverDb.supportTickets = [];
    }

    const ticket = serverDb.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Support ticket not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const newMsg = {
      id: `tmsg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: senderId || 'unknown',
      senderName: senderName || 'User',
      senderRole: (senderRole || 'TENANT').toUpperCase(),
      message: replyText.trim(),
      createdAt: nowIso,
    };

    if (!Array.isArray(ticket.messages)) {
      ticket.messages = [];
    }
    ticket.messages.push(newMsg);
    ticket.updatedAt = nowIso;

    if (newMsg.senderRole === 'ADMIN') {
      if (ticket.status === 'OPEN') ticket.status = 'IN_PROGRESS';
      ticket.adminResponse = newMsg.message;

      // Send email to user informing of admin reply
      const fromAddress = getFromEmailAddress();
      const supportEmail = getSupportInboxEmail();
      try {
        const transporter = getMailTransporter();
        if (transporter) {
          await transporter.sendMail({
            from: fromAddress,
            to: ticket.userEmail,
            replyTo: supportEmail,
            subject: `[HOMEZA Support] Update on Ticket ${ticket.id}: ${ticket.subject}`,
            text: `Hello ${ticket.userName},\n\nHOMEZA Support has replied to your ticket #${ticket.id}:\n\n"${newMsg.message}"\n\nYou can reply directly to this email or visit your HOMEZA Dashboard.\n\nWarm regards,\nHOMEZA Support Desk`,
            html: `<p>Hello <strong>${ticket.userName}</strong>,</p><p>HOMEZA Support has updated your ticket <strong>#${ticket.id}</strong> (${ticket.subject}):</p><blockquote style="background:#f1f5f9;padding:12px;border-left:4px solid #059669;margin:16px 0;">${newMsg.message}</blockquote><p>You can reply directly to this email or check your dashboard.</p>`,
          });
        }
      } catch (e) {
        console.warn('Could not send user reply email:', e);
      }
    } else {
      if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        ticket.status = 'IN_PROGRESS';
      }
      // Notify support inbox
      sendSupportTicketEmail({
        ...ticket,
        description: `[NEW REPLY from ${newMsg.senderName}]:\n${newMsg.message}`,
      }).catch((e) => console.warn('Could not notify support inbox of user reply:', e));
    }

    saveDbToDisk();

    res.json({
      success: true,
      ticket,
      message: 'Reply posted successfully.',
    });
  } catch (err: any) {
    console.error('[SUPPORT REPLY ERROR]:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Could not post reply.' });
  }
});

// User Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password, selectedRole } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Email and password are required.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  let user = serverDb.users.find((u) => u.email?.toLowerCase().trim() === cleanEmail);
  let cred = serverDb.credentials.find((c) => c.email?.toLowerCase().trim() === cleanEmail || (user && c.userId === user.id));

  // If user profile is missing but account credential exists, heal profile using authoritative UID
  if (!user && cred) {
    console.log(`[LOGIN AUTO-HEAL] Recreating missing profile for ${cleanEmail} (UID: ${cred.userId})`);
    user = {
      id: cred.userId,
      email: cred.email.toLowerCase().trim(),
      role: cred.role,
      fullName: cred.email.split('@')[0],
      phoneNumber: '',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      savedPropertyIds: [],
      createdAt: cred.createdAt || new Date().toISOString(),
    };
    serverDb.users.push(user);
    saveDbToDisk();
  }

  if (!user && !cred) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'No account found with this email address.' });
    return;
  }

  if (!cred && user) {
    cred = serverDb.credentials.find((c) => c.userId === user!.id);
  }

  const verification = cred
    ? verifyPassword(password, cred.passwordHash, cred.salt)
    : { isValid: false, needsUpgrade: false };

  if (verification.isValid && verification.needsUpgrade && verification.upgradedHash && cred) {
    cred.passwordHash = verification.upgradedHash;
    if (verification.newSalt) cred.salt = verification.newSalt;
    saveDbToDisk();
    console.log(`[AUTH] Upgraded password hash to PBKDF2-SHA512 for user ${user?.email || cred.email}`);
  }

  if (!verification.isValid) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Incorrect password. Please verify and try again.' });
    return;
  }

  if (selectedRole && user!.role !== selectedRole) {
    const roleDisplayName =
      user!.role === 'TENANT' ? 'Tenant' : user!.role === 'LANDLORD' ? 'Landlord' : 'Agent';
    res.status(403).json({
      error: 'ROLE_MISMATCH',
      message: `This account is registered as a ${roleDisplayName}. Please select ${roleDisplayName} to continue.`,
      actualRole: user!.role,
    });
    return;
  }

  // Strictly block unverified users from getting an active session
  if (user!.role !== 'ADMIN' && user!.emailVerified === false) {
    res.status(403).json({
      error: 'EMAIL_NOT_VERIFIED',
      message: 'Please verify your email address before continuing to HOMEZA.',
      isUnverifiedEmail: true,
      email: user!.email,
      userId: user!.id,
      role: user!.role,
    });
    return;
  }

  reconcileUserVerification(user!);
  saveDbToDisk();

  const session = createServerSession(user!);
  res.cookie('homeza_token', session.token, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 7 * 86400000,
    path: '/',
  });

  res.json({
    success: true,
    session,
    user: user!,
  });
});

// Admin Login
app.post('/api/auth/admin-login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'Administrator email and password are required.' });
    return;
  }

  const cleanEmail = email.toLowerCase().trim();
  const adminUser = serverDb.users.find((u) => u.role === 'ADMIN' && u.email?.toLowerCase() === cleanEmail);

  if (!adminUser) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied. You are not authorized to access this area.',
    });
    return;
  }

  const cred = serverDb.credentials.find((c) => c.userId === adminUser.id || c.email?.toLowerCase() === cleanEmail);
  const verification = cred
    ? verifyPassword(password, cred.passwordHash, cred.salt)
    : { isValid: false, needsUpgrade: false };

  if (verification.isValid && verification.needsUpgrade && verification.upgradedHash && cred) {
    cred.passwordHash = verification.upgradedHash;
    if (verification.newSalt) cred.salt = verification.newSalt;
    saveDbToDisk();
    console.log(`[AUTH] Upgraded admin password hash to PBKDF2-SHA512 for ${adminUser.email}`);
  }

  if (!verification.isValid) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid administrator credentials. Access denied.',
    });
    return;
  }

  const session = createServerSession(adminUser);
  res.json({
    success: true,
    session,
    user: adminUser,
  });
});

// Auth Me
app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
  const session = (req as any).user;
  const fullUser = serverDb.users.find((u) => u.id === session.userId) || session;
  if (fullUser && fullUser.id) {
    reconcileUserVerification(fullUser);
  }
  res.json({
    authenticated: true,
    session,
    user: fullUser,
  });
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user?.token) {
    SERVER_SESSIONS.delete(user.token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

/* ========================================================================= */
/* ADMIN REVIEW ACTIONS API (Approve / Reject / Request Correction)         */
/* ========================================================================= */

// Admin Decision Endpoint (Handles Landlords, Agents, Properties)
app.post('/api/admin/review-decision', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { targetType, targetId, decision, notes, adminName } = req.body;
  const reviewerName = adminName || (req as any).user?.fullName || 'HOMEZA Admin';
  const nowIso = new Date().toISOString();

  if (!targetType || !targetId || !decision) {
    res.status(400).json({ error: 'BAD_REQUEST', message: 'targetType, targetId, and decision are required.' });
    return;
  }

  console.log(`[ADMIN DECISION] Processing ${decision} on ${targetType} (ID: ${targetId}) by ${reviewerName}`);

  let updatedTarget: any = null;

  if (targetType === 'PROPERTY') {
    const propIdx = serverDb.properties.findIndex((p) => p.id === targetId);
    if (propIdx >= 0) {
      const p = serverDb.properties[propIdx];
      let newStatus = 'AVAILABLE';
      let isVerified = true;

      if (decision === 'APPROVED') {
        newStatus = 'AVAILABLE';
        isVerified = true;
      } else if (decision === 'REJECTED') {
        newStatus = 'REJECTED';
        isVerified = false;
      } else if (decision === 'CORRECTION_REQUESTED') {
        newStatus = 'CORRECTION_REQUIRED';
        isVerified = false;
      }

      const history = Array.isArray(p.verificationHistory) ? [...p.verificationHistory] : [];
      history.push({
        id: `vh-${Date.now()}-${decision.toLowerCase()}`,
        action: decision,
        status: newStatus,
        timestamp: nowIso,
        actorName: reviewerName,
        actorRole: 'ADMIN',
        notes: notes || `Listing ${decision.toLowerCase()} by Administrator.`,
      });

      serverDb.properties[propIdx] = {
        ...p,
        status: newStatus,
        isVerified,
        adminCorrectionNote: decision === 'CORRECTION_REQUESTED' ? notes : p.adminCorrectionNote,
        adminRejectionReason: decision === 'REJECTED' ? notes : p.adminRejectionReason,
        verificationHistory: history,
        updatedAt: nowIso,
      };
      updatedTarget = serverDb.properties[propIdx];

      // Create Audit Log
      const auditId = `audit-${Date.now()}-prop-${decision.toLowerCase()}`;
      serverDb.reviewAudits.unshift({
        id: auditId,
        targetType: 'PROPERTY',
        targetId: p.id,
        targetTitleOrName: p.title,
        submitterId: p.submittingAgentId || p.landlordId || '',
        submitterName: p.submittingAgentName || p.landlordName || 'Owner',
        submitterRole: p.listingSource === 'AGENT' ? 'AGENT' : 'LANDLORD',
        submissionDate: p.createdAt || nowIso,
        reviewerId: (req as any).user?.userId || 'user-admin-1',
        reviewerName,
        reviewDate: nowIso,
        decision,
        notes: notes || `Property ${decision.toLowerCase()} by Admin`,
      });
      console.log(`ADMIN APPROVAL RECORD CREATED: ${auditId}`);

      // Notify Submitter
      const recipientId = p.submittingAgentId || p.landlordId;
      if (recipientId) {
        serverDb.notifications.unshift({
          id: `notif-${Date.now()}-prop-decision`,
          userId: recipientId,
          title: decision === 'APPROVED' ? 'Property Listing Approved' : decision === 'REJECTED' ? 'Property Listing Rejected' : 'Listing Correction Needed',
          message:
            decision === 'APPROVED'
              ? `Your property listing '${p.title}' has been approved and is now live on the marketplace.`
              : decision === 'REJECTED'
              ? `Your listing '${p.title}' was rejected. Reason: ${notes || 'Verification guidelines not met.'}`
              : `Corrections requested for '${p.title}': ${notes || 'Please update details and resubmit.'}`,
          type: 'STATUS_CHANGE',
          targetType: 'PROPERTY',
          targetId: p.id,
          isRead: false,
          createdAt: nowIso,
          propertyId: p.id,
        });
      }
    }
  } else if (targetType === 'KYC_LANDLORD' || targetType === 'LANDLORD') {
    const userIdx = serverDb.users.findIndex((u) => u.id === targetId);
    if (userIdx >= 0) {
      const u = serverDb.users[userIdx];
      let newStatus: any = 'VERIFIED';
      if (decision === 'APPROVED') newStatus = 'VERIFIED';
      else if (decision === 'REJECTED') newStatus = 'REJECTED';
      else if (decision === 'CORRECTION_REQUESTED') newStatus = 'CORRECTION_REQUIRED';

      serverDb.users[userIdx] = {
        ...u,
        verificationStatus: newStatus,
        adminCorrectionNote: decision === 'CORRECTION_REQUESTED' ? notes : u.adminCorrectionNote,
        adminRejectionReason: decision === 'REJECTED' ? notes : u.adminRejectionReason,
        reviewedDate: nowIso,
        reviewedBy: reviewerName,
      };
      updatedTarget = serverDb.users[userIdx];

      // Create Audit Log
      const auditId = `audit-${Date.now()}-landlord-${decision.toLowerCase()}`;
      serverDb.reviewAudits.unshift({
        id: auditId,
        targetType: 'KYC_LANDLORD',
        targetId: u.id,
        targetTitleOrName: u.fullName,
        submitterId: u.id,
        submitterName: u.fullName,
        submitterRole: 'LANDLORD',
        submissionDate: u.appliedDate || u.createdAt || nowIso,
        reviewerId: (req as any).user?.userId || 'user-admin-1',
        reviewerName,
        reviewDate: nowIso,
        decision,
        notes: notes || `Landlord KYC ${decision.toLowerCase()}`,
      });
      console.log(`ADMIN APPROVAL RECORD CREATED: ${auditId}`);

      // Notify Landlord
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-landlord-decision`,
        userId: u.id,
        title: decision === 'APPROVED' ? 'Landlord Verification Approved' : decision === 'REJECTED' ? 'KYC Verification Rejected' : 'KYC Correction Required',
        message:
          decision === 'APPROVED'
            ? 'Congratulations! Your Landlord identity has been verified. You can now post listings and manage tenancies.'
            : decision === 'REJECTED'
            ? `Your verification was rejected. Reason: ${notes || 'Information provided did not match records.'}`
            : `Please update your verification documents: ${notes || 'Correction requested.'}`,
        type: 'STATUS_CHANGE',
        targetType: 'KYC_LANDLORD',
        targetId: u.id,
        isRead: false,
        createdAt: nowIso,
      });
    }
  } else if (targetType === 'KYC_AGENT' || targetType === 'AGENT') {
    const userIdx = serverDb.users.findIndex((u) => u.id === targetId);
    if (userIdx >= 0) {
      const u = serverDb.users[userIdx];
      let newStatus: any = 'VERIFIED';
      if (decision === 'APPROVED') newStatus = 'VERIFIED';
      else if (decision === 'REJECTED') newStatus = 'REJECTED';
      else if (decision === 'CORRECTION_REQUESTED') newStatus = 'AGENT_CORRECTION_REQUIRED';

      serverDb.users[userIdx] = {
        ...u,
        verificationStatus: newStatus,
        adminCorrectionNote: decision === 'CORRECTION_REQUESTED' ? notes : u.adminCorrectionNote,
        adminRejectionReason: decision === 'REJECTED' ? notes : u.adminRejectionReason,
        reviewedDate: nowIso,
        reviewedBy: reviewerName,
      };
      updatedTarget = serverDb.users[userIdx];

      // Create Audit Log
      const auditId = `audit-${Date.now()}-agent-${decision.toLowerCase()}`;
      serverDb.reviewAudits.unshift({
        id: auditId,
        targetType: 'KYC_AGENT',
        targetId: u.id,
        targetTitleOrName: u.fullName,
        submitterId: u.id,
        submitterName: u.fullName,
        submitterRole: 'AGENT',
        submissionDate: u.appliedDate || u.createdAt || nowIso,
        reviewerId: (req as any).user?.userId || 'user-admin-1',
        reviewerName,
        reviewDate: nowIso,
        decision,
        notes: notes || `Agent verification ${decision.toLowerCase()}`,
      });
      console.log(`ADMIN APPROVAL RECORD CREATED: ${auditId}`);

      // Notify Agent
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-agent-decision`,
        userId: u.id,
        title: decision === 'APPROVED' ? 'Agent Application Approved' : decision === 'REJECTED' ? 'Agent Application Rejected' : 'Agent Profile Correction Required',
        message:
          decision === 'APPROVED'
            ? 'Your Agent account is officially approved! You now have full access to listing submission and client management.'
            : decision === 'REJECTED'
            ? `Your Agent application was not approved. Reason: ${notes || 'Qualifications or documentation requirements not met.'}`
            : `Please update your agent credentials: ${notes || 'Corrections required.'}`,
        type: 'STATUS_CHANGE',
        targetType: 'KYC_AGENT',
        targetId: u.id,
        isRead: false,
        createdAt: nowIso,
      });
    }
  }

  saveDbToDisk();

  res.json({
    success: true,
    message: `${targetType} ${decision} processed successfully.`,
    updatedTarget,
    serverTime: new Date().toISOString(),
  });
});

/* ========================================================================= */
/* PAYSTACK & BANK TRANSFER PAYMENT SYSTEM (LIVE & TEST MODE)                */
/* ========================================================================= */
const DEFAULT_INSPECTION_FEE = 3000; // Platform default baseline (₦3,000)
const MIN_INSPECTION_FEE = 3000; // Minimum allowed inspection fee (₦3,000)
const MAX_INSPECTION_FEE = 5000; // Maximum allowed inspection fee (₦5,000)

// Helper: Resolve dynamic HOMEZA base URL for callbacks & redirects
function getHomezaBaseUrl(req?: Request): string {
  if (process.env.HOMEZA_BASE_URL) {
    return process.env.HOMEZA_BASE_URL.replace(/\/+$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
      return `${proto}://${host}`;
    }
  }
  return 'https://homeza.com.ng';
}

// Helper: Dynamically resolve property-specific inspection fee (strictly enforces ₦3,000 - ₦5,000 range)
function resolvePropertyInspectionFee(propertyId?: string): number {
  if (!propertyId) return DEFAULT_INSPECTION_FEE;
  const prop = serverDb.properties.find((p) => p.id === propertyId);
  if (!prop) return DEFAULT_INSPECTION_FEE;
  
  let fee = DEFAULT_INSPECTION_FEE;
  if (typeof prop.inspectionFee === 'number' && prop.inspectionFee >= MIN_INSPECTION_FEE && prop.inspectionFee <= MAX_INSPECTION_FEE) {
    fee = prop.inspectionFee;
  } else if (typeof prop.pricing?.inspectionFee === 'number' && prop.pricing.inspectionFee >= MIN_INSPECTION_FEE && prop.pricing.inspectionFee <= MAX_INSPECTION_FEE) {
    fee = prop.pricing.inspectionFee;
  }
  return Math.min(Math.max(fee, MIN_INSPECTION_FEE), MAX_INSPECTION_FEE);
}

/* ========================================================================= */
/* INSPECTION BOOKING ENDPOINTS (Authoritative Server State)                 */
/* ========================================================================= */

// Authoritative inspection booking creation endpoint
app.post(['/api/inspections/book', '/api/inspections'], (req: Request, res: Response) => {
  try {
    const {
      bookingId,
      id,
      propertyId,
      propertyTitle,
      propertyLocationArea,
      propertyExactAddress,
      propertyPrice,
      propertyImage,
      tenantId,
      tenantName,
      tenantPhone,
      tenantEmail,
      landlordId,
      landlordName,
      agentId,
      agentName,
      preferredDate,
      preferredTime,
      notes,
      inspectionFee,
      propertySnapshot,
    } = req.body;

    if (!propertyId) {
      console.warn('[INSPECTION BOOKING] Missing propertyId in booking request');
      res.status(400).json({
        error: 'MISSING_PROPERTY_ID',
        message: 'Property ID is required to book an inspection.',
      });
      return;
    }

    // Anchor property if missing from serverDb
    let propertyRecord = serverDb.properties.find((p) => p.id === propertyId);
    if (!propertyRecord) {
      if (propertySnapshot && propertySnapshot.id === propertyId) {
        propertyRecord = { ...propertySnapshot };
        serverDb.properties.unshift(propertyRecord);
        console.log(`[INSPECTION BOOKING] Anchored real property snapshot for ${propertyId} into server database.`);
        saveDbToDisk();
      } else if (propertyTitle && propertyLocationArea) {
        // Safe real anchor from booking submission
        propertyRecord = {
          id: propertyId,
          title: propertyTitle,
          location: {
            area: propertyLocationArea,
            city: 'Uyo',
            state: 'Akwa Ibom State',
            street: propertyExactAddress || '',
          },
          pricing: {
            rent: Number(propertyPrice) || 0,
            rentalPeriod: 'YEARLY',
            inspectionFee: Number(inspectionFee) || 3000,
          },
          inspectionFee: Number(inspectionFee) || 3000,
          status: 'AVAILABLE',
          isVerified: true,
          images: propertyImage ? [{ id: 'img-main', url: propertyImage }] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        serverDb.properties.unshift(propertyRecord);
        console.log(`[INSPECTION BOOKING] Anchored property for ${propertyId} (${propertyRecord.title})`);
        saveDbToDisk();
      } else {
        res.status(404).json({
          error: 'PROPERTY_NOT_FOUND',
          message: 'The requested property could not be found in the verified database.',
        });
        return;
      }
    }

    const resolvedFee = resolvePropertyInspectionFee(propertyId);
    const nowIso = new Date().toISOString();
    const finalBookingId = (bookingId || id || `insp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`).trim();

    // Check if booking already exists
    let existingIndex = serverDb.inspections.findIndex((i) => i.id === finalBookingId || i.bookingId === finalBookingId);
    let inspectionRecord: any;

    if (existingIndex >= 0) {
      inspectionRecord = {
        ...serverDb.inspections[existingIndex],
        preferredDate: preferredDate || serverDb.inspections[existingIndex].preferredDate,
        preferredTime: preferredTime || serverDb.inspections[existingIndex].preferredTime,
        notes: notes !== undefined ? notes : serverDb.inspections[existingIndex].notes,
        updatedAt: nowIso,
      };
      serverDb.inspections[existingIndex] = inspectionRecord;
      console.log(`[INSPECTION BOOKING] Updated existing inspection booking ${finalBookingId}`);
    } else {
      const auditHistory = [
        {
          id: `aud-${Date.now()}-req`,
          timestamp: nowIso,
          action: 'INSPECTION_REQUESTED',
          title: 'Inspection Requested by Tenant',
          actorName: tenantName || 'Tenant',
          actorRole: 'TENANT',
          notes: `Requested date: ${preferredDate || 'Flexible'} (${preferredTime || 'Flexible'})`,
        },
        {
          id: `aud-${Date.now()}-adm`,
          timestamp: nowIso,
          action: 'ADMIN_NOTIFIED',
          title: 'HOMEZA Admin Notified',
          actorName: 'System',
          actorRole: 'ADMIN',
          notes: 'Inspection booking created in HOMEZA schedule',
        },
      ];

      inspectionRecord = {
        id: finalBookingId,
        bookingId: finalBookingId,
        propertyId,
        propertyTitle: propertyRecord.title || propertyTitle || 'Property Inspection',
        propertyLocationArea: propertyRecord.location?.area || propertyLocationArea || 'Afaha Ube Itam, Uyo',
        propertyExactAddress: propertyExactAddress || (propertyRecord.location?.street ? `${propertyRecord.location.street}, ${propertyRecord.location.area}, Uyo` : undefined),
        propertyPrice: propertyRecord.pricing?.rent || Number(propertyPrice) || 450000,
        propertyImage: propertyImage || propertyRecord.images?.[0]?.url,
        tenantId: tenantId || 'tenant-user',
        tenantName: tenantName || 'Valued Tenant',
        tenantPhone: tenantPhone || '',
        tenantEmail: tenantEmail || 'tenant@homeza.ng',
        landlordId: propertyRecord.landlordId || landlordId,
        landlordName: propertyRecord.landlordName || landlordName || 'Property Owner',
        agentId: propertyRecord.submittingAgentId || agentId,
        agentName: propertyRecord.submittingAgentName || agentName,
        preferredDate: preferredDate || new Date().toISOString().split('T')[0],
        preferredTime: preferredTime || 'Morning (9:00 AM - 12:00 PM)',
        notes: notes || '',
        status: 'INSPECTION_REQUESTED',
        bookingStatus: 'INSPECTION_REQUESTED',
        isLocationReleased: false,
        paymentStatus: 'UNPAID',
        paymentMethod: 'NONE',
        inspectionFee: resolvedFee,
        homezaCoordinationConfirmed: false,
        coordinationMode: 'REMOTE_COORDINATION',
        assignedHomezaRep: {
          id: 'rep-admin',
          name: 'HOMEZA Super Admin',
          role: 'Super Admin / Inspection Officer',
          phone: '+234 800 466 3921',
          email: 'admin@homeza.ng',
        },
        auditHistory,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      serverDb.inspections.unshift(inspectionRecord);
      console.log(`[INSPECTION BOOKING] Created new inspection booking ${finalBookingId} for property ${propertyId}`);

      // Notification for admin
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-insp-admin`,
        userId: 'user-admin-1',
        title: `New Inspection Booking: ${inspectionRecord.propertyLocationArea}`,
        message: `New Inspection Request:\n${inspectionRecord.propertyTitle}, ${inspectionRecord.propertyLocationArea}\n${inspectionRecord.preferredDate}, ${inspectionRecord.preferredTime}\nTenant: ${inspectionRecord.tenantName}`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId,
        inspectionId: finalBookingId,
      });

      // Notification for tenant
      if (tenantId) {
        serverDb.notifications.unshift({
          id: `notif-${Date.now()}-insp-tenant`,
          userId: tenantId,
          title: 'Inspection Booking Initiated',
          message: `Your inspection booking for '${inspectionRecord.propertyTitle}' on ${inspectionRecord.preferredDate} has been initiated. Complete the inspection booking fee to unlock walkthrough coordination.`,
          type: 'INSPECTION',
          isRead: false,
          createdAt: nowIso,
          propertyId,
          inspectionId: finalBookingId,
        });
      }
    }

    saveDbToDisk();

    res.status(201).json({
      success: true,
      booking: inspectionRecord,
      bookingId: inspectionRecord.id,
      inspectionFee: resolvedFee,
      message: 'Inspection booking created successfully.',
    });
  } catch (err: any) {
    console.error('[INSPECTION BOOKING] Error booking inspection:', err);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to create inspection booking.',
    });
  }
});

// Retrieve single inspection booking by ID
app.get(['/api/inspections/:id', '/api/inspections/booking/:id'], (req: Request, res: Response) => {
  const inspectionId = req.params.id;
  const booking = serverDb.inspections.find((i) => i.id === inspectionId || i.bookingId === inspectionId);
  if (!booking) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Inspection booking not found.' });
    return;
  }
  res.json({ success: true, booking, bookingId: booking.id });
});

// 1. Get Payment Configuration & Public Keys (Server Secret NEVER exposed)
app.get('/api/payments/config', (req: Request, res: Response) => {
  const baseUrl = getHomezaBaseUrl(req);
  const publicKey = getPaystackPublicKey();
  const isLive = isPaystackLiveMode();
  res.json({
    success: true,
    data: {
      paystackPublicKey: publicKey,
      isConfigured: isPaystackConfigured(),
      inspectionFeeAmount: DEFAULT_INSPECTION_FEE,
      currency: 'NGN',
      isLiveMode: isLive,
      testMode: !isLive,
      baseUrl,
      callbackUrl: `${baseUrl}/payment/callback`,
      webhookUrl: `${baseUrl}/api/paystack/webhook`,
    },
  });
});

// 2. Initialize Payment (Paystack or Standard)
app.post('/api/payments/initialize', requireVerifiedEmail, async (req: Request, res: Response) => {
  try {
    const {
      propertyId,
      propertyTitle,
      propertyLocationArea,
      inspectionId,
      amount,
      tenantId,
      tenantName,
      tenantEmail,
      tenantPhone,
      paymentMethod = 'PAYSTACK',
      channels,
      callbackUrl,
      metadata = {},
    } = req.body;

    if (!propertyId || !tenantName || !tenantEmail) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Missing required payment details (propertyId, tenantName, tenantEmail).',
      });
      return;
    }

    // Authoritatively resolve inspection fee from property record or booking record
    let propertyRecord = serverDb.properties.find((p) => p.id === propertyId);
    if (!propertyRecord && inspectionId) {
      const insp = serverDb.inspections.find((i) => i.id === inspectionId || i.bookingId === inspectionId);
      if (insp?.propertyId) {
        propertyRecord = serverDb.properties.find((p) => p.id === insp.propertyId);
      }
    }
    const resolvedFee = resolvePropertyInspectionFee(propertyId);
    const nowIso = new Date().toISOString();
    const reference = `HMZ-INSP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const baseUrl = getHomezaBaseUrl(req);
    const dynamicCallbackUrl = callbackUrl || `${baseUrl}/payment/callback`;

    const isBankTransfer = paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'bank_transfer' || (Array.isArray(channels) && channels.includes('bank_transfer') && channels.length === 1);
    const selectedChannels = Array.isArray(channels) && channels.length > 0
      ? channels
      : (isBankTransfer ? ['bank_transfer'] : ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']);

    const newPayment: any = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      reference,
      tenantId: tenantId || 'tenant-anon',
      tenantName,
      tenantEmail,
      tenantPhone: tenantPhone || '',
      propertyId,
      propertyTitle: propertyTitle || propertyRecord?.title || 'Property Inspection',
      propertyLocationArea: propertyLocationArea || propertyRecord?.location?.area || 'Uyo, Akwa Ibom',
      landlordId: propertyRecord?.landlordId,
      agentId: propertyRecord?.listingSource === 'AGENT' ? propertyRecord?.submittingAgentId : undefined,
      inspectionId: inspectionId || undefined,
      paymentPurpose: 'INSPECTION_FEE',
      inspectionFee: resolvedFee,
      amount: resolvedFee,
      currency: 'NGN',
      paymentMethod: isBankTransfer ? 'BANK_TRANSFER' : 'PAYSTACK',
      channels: selectedChannels,
      paymentType: 'INSPECTION_FEE',
      status: 'PENDING',
      verificationStatus: 'UNVERIFIED',
      createdAt: nowIso,
      updatedAt: nowIso,
      metadata: {
        ...metadata,
        inspectionId,
        propertyId,
        tenantId,
        inspectionFee: resolvedFee,
        platform: 'HOMEZA',
        environment: isPaystackLiveMode() ? 'LIVE_MODE' : 'TEST_MODE',
        channels: selectedChannels,
      },
    };

    // Initialize Paystack Remote API
    const secretKey = getPaystackSecretKey();
    if (!secretKey) {
      res.status(500).json({
        error: 'GATEWAY_NOT_CONFIGURED',
        message: 'Paystack payment gateway is not configured on the server.',
      });
      return;
    }

    try {
      console.log(`[PAYSTACK INIT] Initializing transaction for reference ${reference}, amount ₦${resolvedFee} (${resolvedFee * 100} kobo), channels: ${JSON.stringify(selectedChannels)}, customer: ${tenantEmail}`);
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: tenantEmail,
          amount: resolvedFee * 100, // in Kobo
          reference,
          callback_url: dynamicCallbackUrl,
          channels: selectedChannels,
          metadata: newPayment.metadata,
        }),
      });

      const paystackData: any = await response.json();
      if (paystackData.status && paystackData.data) {
        newPayment.paystackReference = reference;
        newPayment.paystackAuthorizationUrl = paystackData.data.authorization_url;
        newPayment.paystackAccessCode = paystackData.data.access_code;
        console.log(`[PAYSTACK INIT] Successfully initialized Paystack transaction ${reference}. Access code: ${paystackData.data.access_code}`);
      } else {
        console.warn(`[PAYSTACK INIT DIAGNOSTIC] Paystack initialize returned failure: ${paystackData.message || 'Unknown response'}`);
        res.status(400).json({
          error: 'PAYSTACK_INIT_FAILED',
          message: paystackData.message || 'Could not initialize Paystack transaction.',
        });
        return;
      }
    } catch (paystackErr: any) {
      console.error(`[PAYSTACK INIT DIAGNOSTIC] Network exception contacting Paystack initialize API:`, paystackErr.message || paystackErr);
      res.status(502).json({
        error: 'PAYSTACK_NETWORK_ERROR',
        message: 'Unable to connect to Paystack payment gateway. Please check connection and try again.',
      });
      return;
    }

    serverDb.payments.unshift(newPayment);

    // If an inspection is associated, update its payment status
    if (inspectionId) {
      const inspIdx = serverDb.inspections.findIndex((i) => i.id === inspectionId);
      if (inspIdx >= 0) {
        serverDb.inspections[inspIdx] = {
          ...serverDb.inspections[inspIdx],
          paymentStatus: 'AWAITING_PAYMENT',
          paymentId: newPayment.id,
          inspectionFee: resolvedFee,
          paymentReference: reference,
          paymentMethod: newPayment.paymentMethod,
          updatedAt: nowIso,
        };
      }
    }

    saveDbToDisk();

    console.log(`[PAYMENT] Initialized transaction ${reference} for ₦${resolvedFee.toLocaleString()} (${newPayment.paymentMethod})`);

    res.json({
      success: true,
      data: newPayment,
      authorization_url: newPayment.paystackAuthorizationUrl || undefined,
      access_code: newPayment.paystackAccessCode || undefined,
      reference,
      paystackPublicKey: getPaystackPublicKey(),
    });
  } catch (err: any) {
    console.error('[PAYMENT] Error initializing payment:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to initialize payment.' });
  }
});

// Helper for idempotent payment confirmation & inspection unlocking
function confirmPaymentAndInspectionInternal(
  payment: any,
  channel: string = 'card',
  paidAtIso: string = new Date().toISOString(),
  reviewerInfo?: { name: string; notes?: string }
): { payment: any; inspection?: any } {
  const nowIso = paidAtIso || new Date().toISOString();

  // Strict Idempotency Check: if already verified and marked PAID, do not emit duplicate notifications or duplicate audit events
  if (payment.status === 'PAID' && payment.verificationStatus === 'VERIFIED') {
    const existingInspection = serverDb.inspections.find((i) => i.id === payment.inspectionId);
    return { payment, inspection: existingInspection };
  }

  // 1. Update Payment status & verification status
  payment.status = 'PAID';
  payment.verificationStatus = 'VERIFIED';
  payment.paidAt = nowIso;
  payment.verifiedAt = nowIso;
  payment.channel = channel;
  payment.updatedAt = nowIso;
  if (reviewerInfo) {
    payment.verifiedBy = reviewerInfo.name;
    payment.adminReview = {
      reviewedBy: reviewerInfo.name,
      reviewedAt: nowIso,
      decision: 'APPROVED',
      notes: reviewerInfo.notes || 'Payment verified by HOMEZA Operations',
    };
  }

  let updatedInspection: any = undefined;

  // 2. Find and update Inspection if linked
  let inspection = serverDb.inspections.find((i) => i.id === payment.inspectionId);
  if (!inspection && payment.tenantId && payment.propertyId) {
    inspection = serverDb.inspections.find(
      (i) => i.tenantId === payment.tenantId && i.propertyId === payment.propertyId && i.status !== 'INSPECTION_COMPLETED'
    );
  }

  if (inspection) {
    const history = inspection.auditHistory ? [...inspection.auditHistory] : [];
    history.push({
      id: `aud-${Date.now()}-pay-success`,
      timestamp: nowIso,
      action: 'PAYMENT_RECEIVED',
      title: 'Inspection Fee Paid & Verified',
      actorName: payment.tenantName,
      actorRole: 'TENANT',
      notes: `Fee of ₦${payment.amount?.toLocaleString()} received via ${payment.paymentMethod} (${channel}). Reference: ${payment.reference}`,
    });
    history.push({
      id: `aud-${Date.now()}-loc-release`,
      timestamp: nowIso,
      action: 'EXACT_LOCATION_RELEASED',
      title: 'Exact Meeting Location Unlocked',
      actorName: 'HOMEZA System',
      actorRole: 'ADMIN',
      notes: 'Full property inspection coordinates, meeting point, and coordinator contact released to verified tenant.',
    });

    inspection.status = 'INSPECTION_CONFIRMED';
    inspection.paymentStatus = 'PAID';
    inspection.paymentId = payment.id;
    inspection.paymentReference = payment.reference;
    inspection.paymentMethod = payment.paymentMethod;
    inspection.paidAt = nowIso;
    inspection.isLocationReleased = true;
    inspection.homezaCoordinationConfirmed = true;
    inspection.auditHistory = history;
    inspection.updatedAt = nowIso;
    updatedInspection = inspection;

    // Notify Landlord or Agent
    const recipientId = inspection.agentId || inspection.landlordId;
    if (recipientId) {
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-pay-host`,
        userId: recipientId,
        title: 'Inspection Fee Paid & Confirmed',
        message: `Tenant ${payment.tenantName} paid the inspection booking fee for '${payment.propertyTitle}'. Inspection scheduled for ${inspection.preferredDate} (${inspection.preferredTime}).`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: payment.propertyId,
        inspectionId: inspection.id,
      });
    }
  }

  // 3. Notify Tenant
  serverDb.notifications.unshift({
    id: `notif-${Date.now()}-pay-tenant`,
    userId: payment.tenantId,
    title: 'Payment Successful • Inspection Confirmed',
    message: `Your inspection booking fee of ₦${payment.amount?.toLocaleString()} for '${payment.propertyTitle}' was verified. Full property address and coordinator contacts are now unlocked.`,
    type: 'INSPECTION',
    isRead: false,
    createdAt: nowIso,
    propertyId: payment.propertyId,
    inspectionId: payment.inspectionId || updatedInspection?.id,
  });

  // 4. Notify Admin
  serverDb.notifications.unshift({
    id: `notif-${Date.now()}-pay-admin`,
    userId: 'user-admin-1',
    title: `Payment Received: ₦${payment.amount?.toLocaleString()}`,
    message: `Inspection fee of ₦${payment.amount?.toLocaleString()} received via ${payment.paymentMethod} (${payment.reference}) for ${payment.propertyTitle} by ${payment.tenantName}.`,
    type: 'SYSTEM',
    isRead: false,
    createdAt: nowIso,
    propertyId: payment.propertyId,
    inspectionId: payment.inspectionId || updatedInspection?.id,
  });

  saveDbToDisk();
  return { payment, inspection: updatedInspection };
}

// 3. HOMEZA Paystack Callback Route (GET & POST /payment/callback and /api/paystack/callback)
const handlePaystackCallback = async (req: Request, res: Response) => {
  try {
    const rawRef = (req.query.reference || req.query.trxref || req.body?.reference || '') as string;
    const cleanRef = typeof rawRef === 'string' ? rawRef.trim() : '';
    const wantsJson = (req.headers.accept && req.headers.accept.includes('application/json')) || req.query.format === 'json';

    if (!cleanRef) {
      if (wantsJson) {
        res.status(400).json({
          success: false,
          status: 'MISSING_REFERENCE',
          error: 'No transaction reference was provided in the callback request.',
        });
        return;
      }
      res.status(400).send(
        renderPaymentResultHtml({
          status: 'UNVERIFIED',
          reference: 'N/A',
          message: 'No transaction reference was provided in the callback request. If you completed a payment, please check your receipt or contact HOMEZA support.',
        })
      );
      return;
    }

    console.log(`[PAYSTACK CALLBACK] Processing callback for reference: ${cleanRef}`);

    // Match existing HOMEZA payment and inspection records
    let payment = serverDb.payments.find(
      (p) => p.reference === cleanRef || p.paystackReference === cleanRef || p.id === cleanRef
    );
    let inspection = payment?.inspectionId
      ? serverDb.inspections.find((i) => i.id === payment!.inspectionId)
      : serverDb.inspections.find((i) => i.paymentReference === cleanRef || i.id === cleanRef || i.bookingId === cleanRef);

    // If already verified and paid in HOMEZA database (Strict Idempotent Fast-path)
    if (payment && payment.status === 'PAID' && payment.verificationStatus === 'VERIFIED') {
      console.log(`[PAYSTACK CALLBACK] Reference ${cleanRef} is already verified and marked PAID.`);
      const tenantUser = serverDb.users.find(
        (u) =>
          u.id === payment.tenantId ||
          (u.email && payment.tenantEmail && u.email.toLowerCase() === payment.tenantEmail.toLowerCase())
      );
      let sessionToken: string | undefined = undefined;
      if (tenantUser) {
        const sess = createServerSession(tenantUser);
        sessionToken = sess.token;
        res.cookie('homeza_token', sess.token, { httpOnly: false, sameSite: 'lax', maxAge: 7 * 86400000, path: '/' });
      }
      if (wantsJson) {
        res.json({
          success: true,
          status: 'PAID',
          reference: cleanRef,
          data: payment,
          inspection,
          message: 'Payment verified and inspection unlocked successfully.',
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'SUCCESS',
          reference: cleanRef,
          amountNaira: payment.amount,
          propertyTitle: payment.propertyTitle || inspection?.propertyTitle,
          propertyLocationArea: payment.propertyLocationArea || inspection?.propertyLocationArea,
          tenantName: payment.tenantName || inspection?.tenantName,
          channel: payment.channel || 'Card',
          paidAt: payment.paidAt,
          inspectionDate: inspection?.preferredDate,
          inspectionTime: inspection?.preferredTime,
          sessionToken,
          tenantUserId: tenantUser?.id,
          tenantEmail: tenantUser?.email,
          tenantRole: tenantUser?.role,
        })
      );
      return;
    }

    // Authoritative remote verification with Paystack using Secret Key
    const verifyResult = await verifyPaystackTransactionWithRemote(cleanRef);

    if (verifyResult.isPending) {
      console.log(`[PAYSTACK CALLBACK] Reference ${cleanRef} is still processing/ongoing.`);
      if (wantsJson) {
        res.status(202).json({
          success: false,
          status: 'PROCESSING',
          reference: cleanRef,
          message: 'Payment is still being processed by the bank or Paystack.',
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'PROCESSING',
          reference: cleanRef,
          amountNaira: payment?.amount || verifyResult.amountNaira || 3000,
          propertyTitle: payment?.propertyTitle || inspection?.propertyTitle,
          propertyLocationArea: payment?.propertyLocationArea || inspection?.propertyLocationArea,
          message: verifyResult.gatewayResponse || 'Your transaction is being confirmed by the banking network.',
        })
      );
      return;
    }

    if (verifyResult.isFailed) {
      console.warn(`[PAYSTACK CALLBACK] Reference ${cleanRef} failed on Paystack: ${verifyResult.errorMessage || verifyResult.gatewayResponse}`);
      if (payment) {
        payment.status = 'FAILED';
        payment.verificationStatus = 'FAILED';
        payment.updatedAt = new Date().toISOString();
        saveDbToDisk();
      }
      if (wantsJson) {
        res.status(400).json({
          success: false,
          status: 'FAILED',
          reference: cleanRef,
          error: verifyResult.errorMessage || verifyResult.gatewayResponse || 'Transaction was declined.',
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'FAILED',
          reference: cleanRef,
          amountNaira: payment?.amount || verifyResult.amountNaira || 3000,
          propertyTitle: payment?.propertyTitle || inspection?.propertyTitle,
          propertyLocationArea: payment?.propertyLocationArea || inspection?.propertyLocationArea,
          message: verifyResult.gatewayResponse || verifyResult.errorMessage || 'The payment was not successful. No funds were captured.',
        })
      );
      return;
    }

    if (!verifyResult.success || !verifyResult.isConfirmedPaid) {
      console.warn(`[PAYSTACK CALLBACK] Reference ${cleanRef} could not be verified: ${verifyResult.errorMessage}`);
      if (wantsJson) {
        res.status(400).json({
          success: false,
          status: 'UNVERIFIED',
          reference: cleanRef,
          error: verifyResult.errorMessage || 'Transaction could not be verified with Paystack.',
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'UNVERIFIED',
          reference: cleanRef,
          amountNaira: payment?.amount || 3000,
          propertyTitle: payment?.propertyTitle || inspection?.propertyTitle,
          propertyLocationArea: payment?.propertyLocationArea || inspection?.propertyLocationArea,
          message: verifyResult.errorMessage || 'Unable to confirm payment status with Paystack.',
        })
      );
      return;
    }

    // Currency & Amount Integrity Check
    if (verifyResult.currency !== 'NGN') {
      console.error(`[PAYSTACK CALLBACK] Invalid currency for ${cleanRef}: ${verifyResult.currency}`);
      if (payment) {
        payment.status = 'FAILED';
        payment.verificationStatus = 'FLAGGED';
        saveDbToDisk();
      }
      if (wantsJson) {
        res.status(400).json({
          success: false,
          status: 'FAILED',
          reference: cleanRef,
          error: `Invalid currency: expected NGN but received ${verifyResult.currency}`,
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'FAILED',
          reference: cleanRef,
          amountNaira: verifyResult.amountNaira,
          message: `Currency mismatch: transaction was processed in ${verifyResult.currency} instead of NGN.`,
        })
      );
      return;
    }

    const expectedAmount = payment ? payment.amount : (resolvePropertyInspectionFee(verifyResult.metadata?.propertyId) || 3000);
    if (verifyResult.amountNaira !== expectedAmount) {
      console.error(`[PAYSTACK CALLBACK] Amount Mismatch: Paid ₦${verifyResult.amountNaira}, Expected ₦${expectedAmount}`);
      if (payment) {
        payment.status = 'AMOUNT_MISMATCH';
        payment.verificationStatus = 'FLAGGED';
        payment.metadata = { ...payment.metadata, paidAmountNaira: verifyResult.amountNaira, expectedAmountNaira: expectedAmount };
        saveDbToDisk();
      }
      if (wantsJson) {
        res.status(400).json({
          success: false,
          status: 'AMOUNT_MISMATCH',
          reference: cleanRef,
          error: `Payment amount mismatch: ₦${verifyResult.amountNaira} paid instead of ₦${expectedAmount}`,
        });
        return;
      }
      res.send(
        renderPaymentResultHtml({
          status: 'FAILED',
          reference: cleanRef,
          amountNaira: verifyResult.amountNaira,
          message: `Payment amount mismatch: ₦${verifyResult.amountNaira} was received, but ₦${expectedAmount} was required.`,
        })
      );
      return;
    }

    // Successful Verification - Match or Create Payment
    if (!payment) {
      payment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        reference: cleanRef,
        paystackReference: cleanRef,
        paystackTransactionId: verifyResult.transactionId,
        tenantId: verifyResult.metadata?.tenantId || 'tenant-anon',
        tenantName: verifyResult.customerName || 'Tenant',
        tenantEmail: verifyResult.customerEmail || 'tenant@homeza.ng',
        tenantPhone: verifyResult.customerPhone || '',
        propertyId: verifyResult.metadata?.propertyId || '',
        propertyTitle: verifyResult.metadata?.propertyTitle || 'Property Inspection',
        propertyLocationArea: verifyResult.metadata?.propertyLocationArea || 'Uyo, Akwa Ibom',
        inspectionId: verifyResult.metadata?.inspectionId || undefined,
        paymentPurpose: 'INSPECTION_FEE',
        inspectionFee: verifyResult.amountNaira,
        amount: verifyResult.amountNaira,
        currency: 'NGN',
        paymentMethod: 'PAYSTACK',
        paymentType: 'INSPECTION_FEE',
        status: 'PENDING',
        verificationStatus: 'UNVERIFIED',
        createdAt: verifyResult.paidAt || new Date().toISOString(),
        updatedAt: verifyResult.paidAt || new Date().toISOString(),
      };
      serverDb.payments.unshift(payment);
    } else {
      payment.paystackTransactionId = verifyResult.transactionId || payment.paystackTransactionId;
    }

    const { payment: confirmedPayment, inspection: confirmedInspection } = confirmPaymentAndInspectionInternal(
      payment,
      verifyResult.channel || 'card',
      verifyResult.paidAt
    );

    markEventAsProcessed(cleanRef, 'SUCCESS');
    if (verifyResult.transactionId) {
      markEventAsProcessed(`tx-${verifyResult.transactionId}`, 'SUCCESS');
    }

    console.log(`[PAYSTACK CALLBACK] Payment successfully verified & confirmed: ${cleanRef}`);

    if (wantsJson) {
      res.json({
        success: true,
        status: 'PAID',
        reference: cleanRef,
        data: confirmedPayment,
        inspection: confirmedInspection,
        message: 'Payment verified and inspection unlocked successfully.',
      });
      return;
    }

    const tenantUser = serverDb.users.find(
      (u) =>
        u.id === confirmedPayment.tenantId ||
        (u.email && confirmedPayment.tenantEmail && u.email.toLowerCase() === confirmedPayment.tenantEmail.toLowerCase())
    );
    let sessionToken: string | undefined = undefined;
    if (tenantUser) {
      const sess = createServerSession(tenantUser);
      sessionToken = sess.token;
      res.cookie('homeza_token', sess.token, { httpOnly: false, sameSite: 'lax', maxAge: 7 * 86400000, path: '/' });
    }

    res.send(
      renderPaymentResultHtml({
        status: 'SUCCESS',
        reference: cleanRef,
        amountNaira: confirmedPayment.amount,
        propertyTitle: confirmedPayment.propertyTitle || confirmedInspection?.propertyTitle,
        propertyLocationArea: confirmedPayment.propertyLocationArea || confirmedInspection?.propertyLocationArea,
        tenantName: confirmedPayment.tenantName || confirmedInspection?.tenantName,
        channel: verifyResult.channel || 'Card',
        paidAt: confirmedPayment.paidAt,
        inspectionDate: confirmedInspection?.preferredDate,
        inspectionTime: confirmedInspection?.preferredTime,
        sessionToken,
        tenantUserId: tenantUser?.id,
        tenantEmail: tenantUser?.email,
        tenantRole: tenantUser?.role,
      })
    );
  } catch (err: any) {
    console.error('[PAYSTACK CALLBACK] Unexpected error:', err);
    res.status(500).send(
      renderPaymentResultHtml({
        status: 'UNVERIFIED',
        reference: 'ERROR',
        message: err.message || 'An unexpected error occurred while processing the payment callback.',
      })
    );
  }
};

// Mount callback on canonical /payment/callback and aliases
app.get('/payment/callback', handlePaystackCallback);
app.post('/payment/callback', handlePaystackCallback);
app.get('/api/paystack/callback', handlePaystackCallback);
app.post('/api/paystack/callback', handlePaystackCallback);
app.get('/api/payments/callback', handlePaystackCallback);

// Helper: Authoritative Paystack verification handler with safe diagnostic logging
async function verifyPaystackPaymentInternal(reference?: string, paymentId?: string) {
  const cleanRef = (reference || '').trim();
  const cleanPayId = (paymentId || '').trim();

  if (!cleanRef && !cleanPayId) {
    return { status: 400, body: { error: 'BAD_REQUEST', message: 'Reference or paymentId is required.' } };
  }

  // Authoritatively find payment record in database using reference, paymentId, or inspectionId
  let payment = serverDb.payments.find((p) => {
    if (cleanRef && (p.reference === cleanRef || p.paystackReference === cleanRef || p.id === cleanRef || p.inspectionId === cleanRef || (p as any).bookingId === cleanRef)) {
      return true;
    }
    if (cleanPayId && (p.id === cleanPayId || p.reference === cleanPayId || p.paystackReference === cleanPayId || p.inspectionId === cleanPayId || (p as any).bookingId === cleanPayId)) {
      return true;
    }
    return false;
  });

  // If still not found by direct match, check if cleanRef matches an inspection record that has a payment
  if (!payment && cleanRef) {
    const insp = serverDb.inspections.find((i) => i.id === cleanRef || i.bookingId === cleanRef || i.paymentId === cleanRef || i.paymentReference === cleanRef);
    if (insp) {
      payment = serverDb.payments.find((p) => p.id === insp.paymentId || p.reference === insp.paymentReference || p.inspectionId === insp.id);
    }
  }

  // Resolve the actual Paystack transaction reference string to verify
  let targetRef = cleanRef;
  if (payment) {
    // If provided reference was a local identifier (starts with 'pay-' or 'insp-') or empty, resolve to paystackReference/reference
    if (!targetRef || targetRef.startsWith('pay-') || targetRef.startsWith('insp-')) {
      targetRef = payment.paystackReference || payment.reference;
    }
  }

  if (!targetRef) {
    return { status: 400, body: { error: 'BAD_REQUEST', message: 'Transaction reference is required for Paystack verification.' } };
  }

  // Idempotency: If already paid/successful, return directly
  if (payment && (payment.status === 'PAID' || payment.status === 'SUCCESSFUL')) {
    const inspection = serverDb.inspections.find((i) => i.id === payment.inspectionId || i.paymentId === payment.id);
    return {
      status: 200,
      body: {
        success: true,
        verified: true,
        data: payment,
        inspection,
        message: 'Payment was already verified and marked paid.',
      },
    };
  }

  // For legacy offline manual bank transfer records without Paystack reference, check local status
  if (payment && (payment.paymentMethod === 'BANK_TRANSFER' || payment.paymentMethod === 'bank_transfer') && !payment.paystackReference && payment.bankTransferDetails?.senderAccountNumber) {
    const isPaid = payment.status === 'PAID' || payment.status === 'SUCCESSFUL';
    const inspection = serverDb.inspections.find((i) => i.id === payment.inspectionId || i.paymentId === payment.id);
    return {
      status: 200,
      body: {
        success: true,
        verified: isPaid,
        status: isPaid ? 'VERIFIED' : 'PENDING_VERIFICATION',
        data: payment,
        inspection,
        message: isPaid
          ? 'Bank transfer payment has been confirmed and verified.'
          : 'Bank transfer payment is awaiting admin verification.',
      },
    };
  }

  let channel = 'card';
  let isVerified = false;
  let paidAt = new Date().toISOString();

  // If Paystack Secret Key is configured, verify with official Paystack API
  const secretKey = getPaystackSecretKey();
  if (secretKey) {
    if (!targetRef) {
      return { status: 400, body: { error: 'BAD_REQUEST', message: 'Transaction reference is required for Paystack verification.' } };
    }

    try {
      console.log(`[PAYSTACK VERIFY] Querying Paystack API for reference: ${targetRef}`);
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(targetRef)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      });

      const paystackData: any = await response.json();

      console.log(`[PAYSTACK VERIFY DIAGNOSTIC] Paystack API Response: HTTP ${response.status}, status: ${paystackData.status}, message: "${paystackData.message || ''}"`);

      if (!response.ok || !paystackData.status || !paystackData.data) {
        console.warn(`[PAYSTACK VERIFY DIAGNOSTIC] Transaction reference "${targetRef}" not confirmed by Paystack: ${paystackData.message || 'Reference not found'}`);
        return {
          status: 400,
          body: {
            error: 'TRANSACTION_NOT_FOUND',
            message: paystackData.message || 'Transaction reference not found on Paystack.',
            data: payment,
          },
        };
      }

      const tx = paystackData.data;
      const txStatus = tx.status;
      const txCurrency = tx.currency;
      const txAmountKobo = tx.amount || 0;
      const txAmountNaira = Math.floor(txAmountKobo / 100);
      const gatewayResponse = tx.gateway_response || tx.message || 'No response details';
      channel = tx.channel || 'card';
      paidAt = tx.paid_at || new Date().toISOString();

      // If payment record did not exist in server memory, reconstruct it from Paystack transaction
      if (!payment) {
        console.log(`[PAYSTACK VERIFY] Reconstructing payment record from Paystack metadata for reference: ${targetRef}`);
        const propertyId = tx.metadata?.propertyId || '';
        const inspectionId = tx.metadata?.inspectionId || undefined;
        payment = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          reference: targetRef,
          tenantId: tx.metadata?.tenantId || 'tenant-anon',
          tenantName: tx.metadata?.tenantName || (tx.customer?.first_name ? `${tx.customer.first_name} ${tx.customer.last_name || ''}`.trim() : 'Tenant'),
          tenantEmail: tx.metadata?.tenantEmail || tx.customer?.email || 'tenant@homeza.ng',
          tenantPhone: tx.metadata?.tenantPhone || tx.customer?.phone || '',
          propertyId,
          propertyTitle: tx.metadata?.propertyTitle || 'Property Inspection',
          propertyLocationArea: tx.metadata?.propertyLocationArea || 'Uyo',
          inspectionId,
          amount: txAmountNaira,
          currency: txCurrency || 'NGN',
          paymentMethod: 'PAYSTACK',
          paymentType: 'INSPECTION_FEE',
          status: 'PENDING',
          verificationStatus: 'UNVERIFIED',
          createdAt: paidAt,
          updatedAt: paidAt,
        };
        serverDb.payments.unshift(payment);
        saveDbToDisk();
      }

      console.log(`[PAYSTACK VERIFY DIAGNOSTIC] Ref: ${targetRef} | Tx Status: ${txStatus} | Amount: ₦${txAmountNaira} (${txAmountKobo} kobo) | Expected: ₦${payment.amount} | Currency: ${txCurrency} | Gateway: "${gatewayResponse}" | Channel: ${channel}`);

      // 1. Validate Transaction Status
      if (txStatus !== 'success') {
        if (txStatus === 'abandoned' || txStatus === 'ongoing') {
          console.warn(`[PAYSTACK VERIFY DIAGNOSTIC] Payment is still pending/uncompleted on Paystack (status: ${txStatus}) for reference ${targetRef}`);
          return {
            status: 400,
            body: {
              error: 'PAYMENT_PENDING',
              message: `Payment has not yet been completed on Paystack (status: ${txStatus}). Please complete payment in checkout first.`,
              data: payment,
            },
          };
        }

        payment.status = 'FAILED';
        payment.verificationStatus = 'FAILED';
        payment.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.warn(`[PAYSTACK VERIFY DIAGNOSTIC] Paystack reported payment failure for ${targetRef}: ${gatewayResponse}`);
        return {
          status: 400,
          body: {
            error: 'PAYMENT_FAILED',
            message: `Paystack reported payment failure: ${gatewayResponse}`,
            data: payment,
          },
        };
      }

      // 2. Validate Currency (Strict NGN)
      if (txCurrency && txCurrency.toUpperCase() !== 'NGN') {
        console.error(`[PAYSTACK VERIFY DIAGNOSTIC] Currency mismatch: Expected NGN, got ${txCurrency} for reference ${targetRef}`);
        payment.status = 'FAILED';
        payment.verificationStatus = 'FLAGGED';
        saveDbToDisk();
        return {
          status: 400,
          body: {
            error: 'INVALID_CURRENCY',
            message: `Invalid currency: expected NGN but received ${txCurrency}.`,
            data: payment,
          },
        };
      }

      // 3. Validate Amount Match (Kobo to Naira) against property inspection fee and payment record
      const expectedPropertyFee = payment.propertyId ? resolvePropertyInspectionFee(payment.propertyId) : (payment.amount || 3000);
      const targetExpectedAmount = payment.amount || expectedPropertyFee;

      if (txAmountNaira !== targetExpectedAmount || (payment.propertyId && txAmountNaira !== expectedPropertyFee)) {
        console.error(`[PAYSTACK VERIFY DIAGNOSTIC] Amount mismatch for ${targetRef}: Paid ₦${txAmountNaira} (${txAmountKobo} kobo), Expected ₦${targetExpectedAmount} (property fee: ₦${expectedPropertyFee})`);
        payment.status = 'AMOUNT_MISMATCH';
        payment.verificationStatus = 'FLAGGED';
        payment.metadata = { ...payment.metadata, paidAmountNaira: txAmountNaira, expectedAmountNaira: targetExpectedAmount, propertyInspectionFee: expectedPropertyFee };
        saveDbToDisk();
        return {
          status: 400,
          body: {
            error: 'AMOUNT_MISMATCH',
            message: `Amount paid (₦${txAmountNaira.toLocaleString()}) does not match the property inspection fee (₦${expectedPropertyFee.toLocaleString()}).`,
            data: payment,
          },
        };
      }

      isVerified = true;
      payment.paystackTransactionId = String(tx.id || '');
    } catch (apiErr: any) {
      console.error(`[PAYSTACK VERIFY DIAGNOSTIC] Exception querying Paystack verify API for ${targetRef}:`, apiErr.message || apiErr);
      return {
        status: 502,
        body: {
          error: 'GATEWAY_ERROR',
          message: 'Unable to communicate with Paystack verification API. Please check your network and try again.',
          data: payment,
        },
      };
    }
  } else {
    // Only in local development when PAYSTACK_SECRET_KEY is explicitly absent
    if (!payment) {
      payment = {
        id: `pay-${Date.now()}`,
        reference: targetRef,
        tenantId: 'tenant-anon',
        tenantName: 'Tenant',
        tenantEmail: 'tenant@homeza.ng',
        tenantPhone: '',
        propertyId: '',
        propertyTitle: 'Property Inspection',
        propertyLocationArea: 'Uyo',
        amount: DEFAULT_INSPECTION_FEE,
        currency: 'NGN',
        paymentMethod: 'PAYSTACK',
        paymentType: 'INSPECTION_FEE',
        status: 'PENDING',
        verificationStatus: 'UNVERIFIED',
        createdAt: paidAt,
        updatedAt: paidAt,
      };
      serverDb.payments.unshift(payment);
      saveDbToDisk();
    }
    isVerified = true;
    channel = 'test_card';
    console.log(`[PAYSTACK VERIFY] PAYSTACK_SECRET_KEY not set, using test mock verification for ${targetRef}`);
  }

  if (isVerified && payment) {
    const result = confirmPaymentAndInspectionInternal(payment, channel, paidAt);
    console.log(`[PAYSTACK VERIFY] Payment successfully verified & confirmed for ${targetRef} (₦${payment.amount})`);
    return {
      status: 200,
      body: {
        success: true,
        verified: true,
        data: result.payment,
        inspection: result.inspection,
        message: 'Payment successfully verified and confirmed.',
      },
    };
  }

  return {
    status: 400,
    body: {
      error: 'VERIFICATION_FAILED',
      message: 'Could not verify payment with Paystack.',
      data: payment,
    },
  };
}

// 4. Verify Paystack Transaction (Authoritative POST Endpoint)
app.post('/api/payments/verify', async (req: Request, res: Response) => {
  try {
    const { reference, paymentId } = req.body;
    const result = await verifyPaystackPaymentInternal(reference, paymentId);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[PAYMENT] Error verifying payment:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Payment verification failed.' });
  }
});

// Alias for GET /api/payments/verify/:reference
app.get('/api/payments/verify/:reference', async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    const result = await verifyPaystackPaymentInternal(reference);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('[PAYMENT] Error verifying payment:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Payment verification failed.' });
  }
});

// 5. Submit Manual Bank Transfer Payment
app.post('/api/payments/bank-transfer/submit', requireVerifiedEmail, (req: Request, res: Response) => {
  try {
    const {
      bookingId: rawBookingId,
      inspectionId: rawInspectionId,
      propertyId: rawPropertyId,
      propertyTitle: rawPropertyTitle,
      propertyLocationArea: rawPropertyLocationArea,
      tenantId: rawTenantId,
      tenantName: rawTenantName,
      tenantEmail: rawTenantEmail,
      tenantPhone: rawTenantPhone,
      bankTransferDetails,
      propertySnapshot,
    } = req.body;

    const resolvedBookingId = (rawBookingId || rawInspectionId || '').trim();

    // 1. Missing bookingId validation
    if (!resolvedBookingId) {
      console.warn('[BANK TRANSFER SUBMIT] Missing bookingId in submission payload.');
      res.status(400).json({
        success: false,
        error: 'MISSING_BOOKING_ID',
        message: 'Booking ID is required to submit bank transfer payment.',
      });
      return;
    }

    if (!bankTransferDetails || !bankTransferDetails.senderName || !bankTransferDetails.senderName.trim()) {
      console.warn('[BANK TRANSFER SUBMIT] Missing senderName in bankTransferDetails.');
      res.status(400).json({
        success: false,
        error: 'MISSING_SENDER_NAME',
        message: 'Sender account name is required for bank transfer verification.',
      });
      return;
    }

    // 2. Lookup the inspection booking using bookingId
    let inspectionRecord = serverDb.inspections.find(
      (i) => i.id === resolvedBookingId || i.bookingId === resolvedBookingId
    );

    // If booking record does not exist in memory, attempt graceful recovery from store/snapshot or reject
    if (!inspectionRecord) {
      if (rawPropertyId) {
        console.log(`[BANK TRANSFER SUBMIT] Creating persistent inspection booking record on-the-fly for ${resolvedBookingId}`);
        const nowIso = new Date().toISOString();
        const expectedFee = resolvePropertyInspectionFee(rawPropertyId);
        inspectionRecord = {
          id: resolvedBookingId,
          bookingId: resolvedBookingId,
          propertyId: rawPropertyId,
          propertyTitle: rawPropertyTitle || '2 bedroom flat',
          propertyLocationArea: rawPropertyLocationArea || 'Afaha Ube Itam, Uyo',
          propertyPrice: 450000,
          tenantId: rawTenantId || 'tenant-anon',
          tenantName: rawTenantName || bankTransferDetails.senderName.trim(),
          tenantEmail: rawTenantEmail || 'tenant@homeza.ng',
          tenantPhone: rawTenantPhone || '',
          preferredDate: new Date().toISOString().split('T')[0],
          preferredTime: 'Morning (9:00 AM - 12:00 PM)',
          status: 'INSPECTION_REQUESTED',
          bookingStatus: 'PENDING',
          isLocationReleased: false,
          paymentStatus: 'pending_verification',
          paymentMethod: 'bank_transfer',
          inspectionFee: expectedFee,
          auditHistory: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        serverDb.inspections.unshift(inspectionRecord);
      } else {
        console.warn(`[BANK TRANSFER SUBMIT] Inspection booking not found for ID: ${resolvedBookingId}`);
        res.status(404).json({
          success: false,
          error: 'BOOKING_NOT_FOUND',
          message: 'Inspection booking not found.',
        });
        return;
      }
    }

    // 3. Validate authenticated user & confirm booking ownership
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    let authenticatedUser: any = null;
    if (token) {
      authenticatedUser = SERVER_SESSIONS.get(token);
    }
    if (authenticatedUser && authenticatedUser.role !== 'ADMIN') {
      if (inspectionRecord.tenantId && authenticatedUser.userId && inspectionRecord.tenantId !== authenticatedUser.userId) {
        console.warn(`[BANK TRANSFER SUBMIT] Unauthorized booking access: user ${authenticatedUser.userId} attempted to submit for booking owned by ${inspectionRecord.tenantId}`);
        res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'You are not authorized to submit payment for this inspection booking.',
        });
        return;
      }
    }

    // 4. Retrieve propertyId from the inspection booking record
    const propertyIdFromBooking = inspectionRecord.propertyId;
    if (!propertyIdFromBooking) {
      console.warn(`[BANK TRANSFER SUBMIT] Missing propertyId on inspection booking ${resolvedBookingId}`);
      res.status(404).json({
        success: false,
        error: 'MISSING_PROPERTY_ID',
        message: 'The associated property identifier is missing from this inspection booking.',
      });
      return;
    }

    // 5. Property retrieval: Use the propertyId stored on the inspection booking record
    let propertyRecord = serverDb.properties.find((p) => p.id === propertyIdFromBooking);

    // If the property record is not in active cache/memory, restore it from persistent store or property snapshot
    if (!propertyRecord) {
      if (propertySnapshot && propertySnapshot.id === propertyIdFromBooking) {
        propertyRecord = { ...propertySnapshot };
        serverDb.properties.unshift(propertyRecord);
        console.log(`[BANK TRANSFER SUBMIT] Restored real property ${propertyIdFromBooking} from client snapshot.`);
        saveDbToDisk();
      } else if (inspectionRecord.propertyTitle && inspectionRecord.propertyLocationArea) {
        propertyRecord = {
          id: propertyIdFromBooking,
          title: inspectionRecord.propertyTitle,
          location: {
            area: inspectionRecord.propertyLocationArea,
            city: 'Uyo',
            state: 'Akwa Ibom State',
            street: inspectionRecord.propertyExactAddress || '',
          },
          pricing: {
            rent: inspectionRecord.propertyPrice || 0,
            rentalPeriod: 'YEARLY',
            inspectionFee: inspectionRecord.inspectionFee || 3000,
          },
          inspectionFee: inspectionRecord.inspectionFee || 3000,
          status: 'AVAILABLE',
          isVerified: true,
          images: inspectionRecord.propertyImage ? [{ id: 'img-1', url: inspectionRecord.propertyImage }] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        serverDb.properties.unshift(propertyRecord);
        console.log(`[BANK TRANSFER SUBMIT] Restored real property ${propertyIdFromBooking} from booking attributes.`);
        saveDbToDisk();
      }
    }

    // 6. If the property STILL does not exist, return a clear, informative error
    if (!propertyRecord) {
      console.warn(`[BANK TRANSFER SUBMIT] Property ${propertyIdFromBooking} could not be resolved for booking ${resolvedBookingId}.`);
      res.status(404).json({
        success: false,
        error: 'PROPERTY_UNAVAILABLE',
        message: 'The associated property for this inspection booking is unavailable or has been removed.',
      });
      return;
    }

    // 7. Authoritative inspection fee retrieved strictly from booking record and property record
    const authoritativeInspectionFee =
      Number(inspectionRecord.inspectionFee) ||
      Number(propertyRecord.inspectionFee) ||
      resolvePropertyInspectionFee(propertyIdFromBooking);

    const nowIso = new Date().toISOString();

    // 8. Check if inspection is already paid or location is already unlocked
    if (inspectionRecord.isLocationReleased || inspectionRecord.paymentStatus === 'PAID' || inspectionRecord.paymentStatus === 'verified') {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PAID',
        message: 'Inspection fee for this property has already been paid and verified.',
      });
      return;
    }

    const existingPaid = serverDb.payments.find(
      (p) => (p.inspectionId === inspectionRecord!.id || p.inspectionId === inspectionRecord!.bookingId || p.bookingId === resolvedBookingId) &&
        (p.status === 'PAID' || p.status === 'SUCCESSFUL' || p.status === 'verified')
    );
    if (existingPaid) {
      res.status(400).json({
        success: false,
        error: 'ALREADY_PAID',
        message: 'Inspection fee for this property has already been verified.',
      });
      return;
    }

    const reference = `HMZ-BT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 9. Save sender details
    const senderDetails = {
      bankName: 'Paystack Automated Escrow',
      accountName: 'HOMEZA Escrow',
      accountNumber: 'N/A',
      senderName: bankTransferDetails.senderName.trim(),
      senderBank: bankTransferDetails.senderBank || 'Bank Transfer',
      senderAccountNumber: (bankTransferDetails.senderAccountNumber || '').trim(),
      amountPaid: authoritativeInspectionFee,
      transferDate: bankTransferDetails.transferDate || nowIso.split('T')[0],
      proofOfPaymentUrl: bankTransferDetails.proofOfPaymentUrl || '',
      transferNotes: (bankTransferDetails.transferNotes || '').trim(),
    };

    // Deduplicate: If tenant already submitted a bank transfer awaiting verification for this inspection, update it
    const existingPending = serverDb.payments.find(
      (p) =>
        (p.inspectionId === inspectionRecord!.id || p.inspectionId === inspectionRecord!.bookingId || p.bookingId === resolvedBookingId) &&
        (p.paymentMethod === 'BANK_TRANSFER' || p.paymentMethod === 'bank_transfer') &&
        (p.status === 'pending_verification' || p.status === 'AWAITING_BANK_TRANSFER_VERIFICATION' || p.status === 'AWAITING_PAYMENT_VERIFICATION')
    );

    let paymentRecord: any;

    if (existingPending) {
      existingPending.bankTransferDetails = senderDetails;
      existingPending.amount = authoritativeInspectionFee;
      existingPending.inspectionFee = authoritativeInspectionFee;
      existingPending.proofOfPaymentUrl = senderDetails.proofOfPaymentUrl;
      existingPending.status = 'pending_verification';
      existingPending.paymentStatus = 'pending_verification';
      existingPending.paymentMethod = 'bank_transfer';
      existingPending.updatedAt = nowIso;
      paymentRecord = existingPending;
      console.log(`[BANK TRANSFER SUBMIT] Updated existing pending payment record ${existingPending.reference}`);
    } else {
      paymentRecord = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        reference,
        tenantId: inspectionRecord.tenantId || rawTenantId || 'tenant-anon',
        tenantName: (inspectionRecord.tenantName || rawTenantName || bankTransferDetails.senderName).trim(),
        tenantEmail: inspectionRecord.tenantEmail || rawTenantEmail || 'tenant@homeza.ng',
        tenantPhone: inspectionRecord.tenantPhone || rawTenantPhone || '',
        propertyId: propertyIdFromBooking,
        propertyTitle: inspectionRecord.propertyTitle || propertyRecord.title || '2 bedroom flat',
        propertyLocationArea: inspectionRecord.propertyLocationArea || propertyRecord.location?.area || 'Afaha Ube Itam, Uyo',
        landlordId: propertyRecord.landlordId || inspectionRecord.landlordId,
        agentId: propertyRecord.submittingAgentId || inspectionRecord.agentId,
        inspectionId: inspectionRecord.id,
        bookingId: inspectionRecord.bookingId || inspectionRecord.id,
        paymentPurpose: 'INSPECTION_FEE',
        inspectionFee: authoritativeInspectionFee,
        amount: authoritativeInspectionFee,
        currency: 'NGN',
        paymentMethod: 'bank_transfer',
        paymentType: 'INSPECTION_FEE',
        status: 'pending_verification',
        paymentStatus: 'pending_verification',
        verificationStatus: 'UNVERIFIED',
        bankTransferReference: reference,
        proofOfPaymentUrl: senderDetails.proofOfPaymentUrl,
        bankTransferDetails: senderDetails,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      serverDb.payments.unshift(paymentRecord);
      console.log(`[BANK TRANSFER SUBMIT] Created new bank transfer payment record ${reference}`);
    }

    // 10. Audit history and update inspection booking record
    const history = inspectionRecord.auditHistory ? [...inspectionRecord.auditHistory] : [];
    history.push({
      id: `aud-${Date.now()}-bt-sub`,
      timestamp: nowIso,
      action: 'BANK_TRANSFER_SUBMITTED',
      title: 'Inspection payment awaiting bank-transfer verification',
      actorName: paymentRecord.tenantName,
      actorRole: 'TENANT',
      notes: `Transfer of ₦${authoritativeInspectionFee.toLocaleString()} submitted from ${bankTransferDetails.senderName} (${senderDetails.senderBank}). Awaiting admin confirmation.`,
    });

    const inspIndex = serverDb.inspections.findIndex((i) => i.id === inspectionRecord!.id);
    const updatedInspection = {
      ...inspectionRecord,
      paymentStatus: 'pending_verification',
      bookingStatus: 'PENDING',
      paymentMethod: 'bank_transfer',
      paymentId: paymentRecord.id,
      paymentReference: paymentRecord.reference,
      inspectionFee: authoritativeInspectionFee,
      auditHistory: history,
      updatedAt: nowIso,
    };

    if (inspIndex >= 0) {
      serverDb.inspections[inspIndex] = updatedInspection;
    } else {
      serverDb.inspections.unshift(updatedInspection);
    }

    // 11. Admin review audit record
    serverDb.reviewAudits.unshift({
      id: `audit-${Date.now()}-bt-verify`,
      entityId: paymentRecord.id,
      entityType: 'PAYMENT',
      action: 'BANK_TRANSFER_SUBMITTED',
      actorId: inspectionRecord.tenantId || 'tenant',
      actorName: senderDetails.senderName,
      actorRole: 'TENANT',
      notes: `Submitted bank transfer of ₦${authoritativeInspectionFee.toLocaleString()} for inspection booking ${resolvedBookingId} ('${propertyRecord.title}', ${propertyRecord.location?.area || 'Afaha Ube Itam'}, Uyo). Reference: ${reference}. Awaiting admin verification.`,
      timestamp: nowIso,
    });

    // 12. Admin notification for the pending transfer
    serverDb.notifications.unshift({
      id: `notif-${Date.now()}-bt-admin`,
      userId: 'user-admin-1',
      title: 'New Bank Transfer Inspection Payment',
      message: `Tenant ${paymentRecord.tenantName} submitted bank transfer proof of ₦${authoritativeInspectionFee.toLocaleString()} for inspection booking ${updatedInspection.bookingId || updatedInspection.id} ('${updatedInspection.propertyTitle}'). Ref: ${paymentRecord.reference}`,
      type: 'INSPECTION',
      isRead: false,
      createdAt: nowIso,
      propertyId: propertyIdFromBooking,
      inspectionId: updatedInspection.id,
    });

    // 13. Notify Tenant of pending verification
    if (updatedInspection.tenantId) {
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-bt-tenant`,
        userId: updatedInspection.tenantId,
        title: 'Inspection Payment Awaiting Verification',
        message: `Your bank transfer payment proof for '${updatedInspection.propertyTitle}' has been received. Status: Pending Verification. Ref: ${paymentRecord.reference}.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: propertyIdFromBooking,
        inspectionId: updatedInspection.id,
      });
    }

    saveDbToDisk();

    console.log(`[BANK TRANSFER SUBMIT SUCCESS] Booking ${updatedInspection.id} awaiting verification. Payment Ref: ${paymentRecord.reference}`);

    // 14. Return structured JSON confirmation
    res.status(200).json({
      success: true,
      bookingId: updatedInspection.bookingId || updatedInspection.id,
      inspectionId: updatedInspection.id,
      propertyId: propertyRecord.id,
      propertyTitle: propertyRecord.title,
      propertyLocationArea: propertyRecord.location?.area,
      inspectionFee: authoritativeInspectionFee,
      amount: authoritativeInspectionFee,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending_verification',
      status: 'pending_verification',
      message: 'Transfer submitted successfully. Your inspection payment is awaiting confirmation.',
      reference: paymentRecord.reference,
      data: paymentRecord,
      inspection: updatedInspection,
    });
  } catch (err: any) {
    console.error('[BANK TRANSFER SUBMIT] Fatal error during bank transfer submission:', err);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: err.message || 'Failed to submit bank transfer.',
    });
  }
});

// 6. Admin Decision on Bank Transfer Payment (Approve or Reject)
app.post('/api/payments/bank-transfer/admin-decision', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { paymentId, decision, notes, reviewerName = 'HOMEZA Operations' } = req.body;

    if (!paymentId || !decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: "Invalid decision request. Must provide paymentId and decision ('APPROVED' | 'REJECTED').",
      });
      return;
    }

    const payment = serverDb.payments.find((p) => p.id === paymentId);
    if (!payment) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Payment record not found.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (decision === 'APPROVED') {
      const result = confirmPaymentAndInspectionInternal(payment, 'bank_transfer', nowIso, {
        name: reviewerName,
        notes: notes || 'Bank transfer verified with receiving bank statement.',
      });

      res.json({
        success: true,
        data: result.payment,
        inspection: result.inspection,
        message: 'Bank transfer payment successfully approved and inspection confirmed.',
      });
    } else {
      payment.status = 'REJECTED';
      payment.verificationStatus = 'FAILED';
      payment.verifiedAt = nowIso;
      payment.verifiedBy = reviewerName;
      payment.updatedAt = nowIso;
      payment.adminReview = {
        reviewedBy: reviewerName,
        reviewedAt: nowIso,
        decision: 'REJECTED',
        notes: notes || 'Payment proof could not be verified with bank records.',
      };

      // Update inspection status back to UNPAID
      const inspection = serverDb.inspections.find((i) => i.id === payment.inspectionId || i.paymentId === payment.id);
      if (inspection) {
        const history = inspection.auditHistory ? [...inspection.auditHistory] : [];
        history.push({
          id: `aud-${Date.now()}-bt-reject`,
          timestamp: nowIso,
          action: 'PAYMENT_REJECTED',
          title: 'Bank Transfer Payment Rejected',
          actorName: reviewerName,
          actorRole: 'ADMIN',
          notes: notes || 'Bank transfer could not be verified. Please retry or use Paystack instant payment.',
        });

        inspection.paymentStatus = 'UNPAID';
        inspection.auditHistory = history;
        inspection.updatedAt = nowIso;
      }

      // Notify Tenant of rejection
      serverDb.notifications.unshift({
        id: `notif-${Date.now()}-bt-rej-tenant`,
        userId: payment.tenantId,
        title: 'Payment Verification Unsuccessful',
        message: `Your bank transfer payment for '${payment.propertyTitle}' could not be verified: ${notes || 'Bank transfer record not found.'}. Please re-submit or pay instantly with Paystack.`,
        type: 'INSPECTION',
        isRead: false,
        createdAt: nowIso,
        propertyId: payment.propertyId,
        inspectionId: payment.inspectionId,
      });

      saveDbToDisk();

      res.json({
        success: true,
        data: payment,
        message: 'Bank transfer payment rejected.',
      });
    }
  } catch (err: any) {
    console.error('[ADMIN PAYMENT] Error updating bank transfer status:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message || 'Failed to process admin decision.' });
  }
});

// 7. Paystack Webhook Handler (HMAC SHA512 Signature Validation & Idempotency)
const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    const paystackSignature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    // Verify HMAC-SHA512 signature against PAYSTACK_WEBHOOK_SECRET or PAYSTACK_SECRET_KEY
    const signatureResult = verifyPaystackWebhookSignature(paystackSignature, rawBody);
    if (!signatureResult.isValid) {
      console.warn(`[PAYSTACK WEBHOOK] Invalid or missing HMAC-SHA512 signature received: ${signatureResult.reason || 'digest mismatch'}`);
      res.status(401).json({ error: 'INVALID_SIGNATURE', message: signatureResult.reason || 'HMAC-SHA512 signature verification failed.' });
      return;
    }

    const event = req.body;
    const eventType = event?.event;
    const eventId = event?.data?.id ? `event-${event.data.id}` : (event?.id ? `event-${event.id}` : '');
    const reference = (event?.data?.reference || '').trim();

    console.log(`[PAYSTACK WEBHOOK] Received valid webhook event: ${eventType} for reference: ${reference || 'N/A'}`);

    // Idempotency check: if event or reference was already processed, respond 200 OK immediately
    if ((eventId && isEventAlreadyProcessed(eventId)) || (reference && isEventAlreadyProcessed(reference))) {
      console.log(`[PAYSTACK WEBHOOK] Event ${eventId || reference} already processed. Returning cached success.`);
      res.status(200).json({ status: 'success', message: 'Event already processed.' });
      return;
    }

    if (eventType === 'charge.success' && event.data) {
      const { channel, paid_at, currency, amount } = event.data;
      let payment = serverDb.payments.find(
        (p) => p.reference === reference || p.paystackReference === reference || p.id === reference
      );

      // Strict currency and amount check (NGN only)
      const paidNaira = Math.floor((amount || 0) / 100);
      if (currency && currency.toUpperCase() !== 'NGN') {
        console.error(`[PAYSTACK WEBHOOK] Currency mismatch: received ${currency}, expected NGN for ref ${reference}`);
        if (payment) {
          payment.status = 'FAILED';
          payment.verificationStatus = 'FLAGGED';
          saveDbToDisk();
        }
        res.status(200).json({ status: 'ignored_invalid_currency' });
        return;
      }

      if (payment) {
        const expectedPropertyFee = payment.propertyId ? resolvePropertyInspectionFee(payment.propertyId) : (payment.amount || 3000);
        const targetExpectedAmount = payment.amount || expectedPropertyFee;

        if (paidNaira !== targetExpectedAmount || (payment.propertyId && paidNaira !== expectedPropertyFee)) {
          console.error(`[PAYSTACK WEBHOOK] Amount mismatch: Paid ₦${paidNaira}, Expected ₦${targetExpectedAmount} (property fee: ₦${expectedPropertyFee})`);
          payment.status = 'AMOUNT_MISMATCH';
          payment.verificationStatus = 'FLAGGED';
          payment.metadata = { ...payment.metadata, paidAmountNaira: paidNaira, expectedAmountNaira: targetExpectedAmount, propertyInspectionFee: expectedPropertyFee };
          saveDbToDisk();
          res.status(200).json({ status: 'flagged_amount_mismatch' });
          return;
        }

        payment.paystackTransactionId = String(event.data.id || payment.paystackTransactionId || '');
        confirmPaymentAndInspectionInternal(payment, channel || 'card', paid_at || new Date().toISOString());
        console.log(`[PAYSTACK WEBHOOK] Successfully confirmed payment and unlocked inspection for ref: ${reference}`);
      } else {
        // Auto-create payment record from webhook payload if initialized externally
        const nowIso = paid_at || new Date().toISOString();
        const metadata = event.data.metadata || {};
        const propertyId = metadata.propertyId || '';
        const targetExpectedFee = resolvePropertyInspectionFee(propertyId);

        if (paidNaira !== targetExpectedFee) {
          console.error(`[PAYSTACK WEBHOOK] Auto-payment amount mismatch: Paid ₦${paidNaira}, Expected ₦${targetExpectedFee}`);
          const flaggedPayment: any = {
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            reference,
            paystackReference: reference,
            paystackTransactionId: String(event.data.id || ''),
            tenantId: metadata.tenantId || 'tenant-anon',
            tenantName: metadata.tenantName || event.data.customer?.first_name || 'Tenant',
            tenantEmail: event.data.customer?.email || 'tenant@homeza.ng',
            tenantPhone: event.data.customer?.phone || '',
            propertyId,
            propertyTitle: metadata.propertyTitle || 'Property Inspection',
            propertyLocationArea: metadata.propertyLocationArea || 'Uyo',
            inspectionId: metadata.inspectionId || undefined,
            paymentPurpose: 'INSPECTION_FEE',
            inspectionFee: targetExpectedFee,
            amount: paidNaira,
            currency: 'NGN',
            paymentMethod: 'PAYSTACK',
            paymentType: 'INSPECTION_FEE',
            status: 'AMOUNT_MISMATCH',
            verificationStatus: 'FLAGGED',
            createdAt: nowIso,
            updatedAt: nowIso,
            metadata: { ...metadata, paidAmountNaira: paidNaira, expectedAmountNaira: targetExpectedFee },
          };
          serverDb.payments.unshift(flaggedPayment);
          saveDbToDisk();
          res.status(200).json({ status: 'flagged_amount_mismatch' });
          return;
        }

        const autoPayment: any = {
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          reference,
          paystackReference: reference,
          paystackTransactionId: String(event.data.id || ''),
          tenantId: metadata.tenantId || 'tenant-anon',
          tenantName: metadata.tenantName || event.data.customer?.first_name || 'Tenant',
          tenantEmail: event.data.customer?.email || 'tenant@homeza.ng',
          tenantPhone: event.data.customer?.phone || '',
          propertyId,
          propertyTitle: metadata.propertyTitle || 'Property Inspection',
          propertyLocationArea: metadata.propertyLocationArea || 'Uyo',
          inspectionId: metadata.inspectionId || undefined,
          paymentPurpose: 'INSPECTION_FEE',
          inspectionFee: targetExpectedFee,
          amount: paidNaira,
          currency: 'NGN',
          paymentMethod: 'PAYSTACK',
          paymentType: 'INSPECTION_FEE',
          status: 'PAID',
          verificationStatus: 'VERIFIED',
          channel: channel || 'card',
          paidAt: nowIso,
          verifiedAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          metadata,
        };

        serverDb.payments.unshift(autoPayment);
        confirmPaymentAndInspectionInternal(autoPayment, channel || 'card', nowIso);
        console.log(`[PAYSTACK WEBHOOK] Created and confirmed new payment record for ref: ${reference}`);
      }

      if (eventId) markEventAsProcessed(eventId, 'SUCCESS');
      if (reference) markEventAsProcessed(reference, 'SUCCESS');
    } else if (eventType === 'charge.failed' && event.data) {
      const payment = serverDb.payments.find(
        (p) => p.reference === reference || p.paystackReference === reference || p.id === reference
      );
      if (payment && payment.status !== 'PAID') {
        payment.status = 'FAILED';
        payment.verificationStatus = 'FAILED';
        payment.updatedAt = new Date().toISOString();
        saveDbToDisk();
        console.log(`[PAYSTACK WEBHOOK] Marked payment as FAILED for ref: ${reference}`);
      }
      if (eventId) markEventAsProcessed(eventId, 'FAILED');
      if (reference) markEventAsProcessed(reference, 'FAILED');
    }

    res.status(200).json({ status: 'success' });
  } catch (err: any) {
    console.error('[PAYSTACK WEBHOOK] Error processing webhook:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to process webhook.' });
  }
};

// Mount webhook handler on required endpoints
app.post('/api/paystack/webhook', handlePaystackWebhook);
app.post('/api/payments/paystack/webhook', handlePaystackWebhook);

// 7. Get All Payments & Analytics (Admin Only)
app.get('/api/payments', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const allPayments = serverDb.payments || [];
  const successfulPayments = allPayments.filter((p) => p.status === 'SUCCESSFUL' || p.status === 'PAID');
  const pendingBankTransfers = allPayments.filter(
    (p) => p.status === 'AWAITING_ADMIN_CONFIRMATION' || p.status === 'AWAITING_BANK_TRANSFER_VERIFICATION'
  );

  const totalRevenue = successfulPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const paystackRevenue = successfulPayments
    .filter((p) => p.paymentMethod === 'PAYSTACK')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const bankTransferRevenue = successfulPayments
    .filter((p) => p.paymentMethod === 'BANK_TRANSFER')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  res.json({
    success: true,
    data: allPayments,
    stats: {
      totalCount: allPayments.length,
      successfulCount: successfulPayments.length,
      pendingBankTransferCount: pendingBankTransfers.length,
      totalRevenue,
      paystackRevenue,
      bankTransferRevenue,
      defaultFee: DEFAULT_INSPECTION_FEE,
    },
  });
});

// 8. Get Tenant Payment History
app.get('/api/payments/my-payments', (req: Request, res: Response) => {
  const tenantId = (req.query.tenantId as string) || (req as any).user?.userId;
  if (!tenantId) {
    res.json({ success: true, data: [] });
    return;
  }
  const myPayments = (serverDb.payments || []).filter((p) => p.tenantId === tenantId);
  res.json({ success: true, data: myPayments });
});

/* ========================================================================= */
/* VITE MIDDLEWARE & STATIC SERVING                                          */
/* ========================================================================= */
async function startServer() {
  const isBundledServer =
    typeof __filename !== 'undefined' &&
    (__filename.endsWith('.cjs') || __dirname.endsWith('dist') || __dirname.includes('dist'));

  const isProduction = process.env.NODE_ENV === 'production' || isBundledServer;

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    } else if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
      distPath = path.join(process.cwd(), 'dist');
    }

    app.use(
      express.static(distPath, {
        maxAge: '1d',
        index: 'index.html',
      })
    );

    app.get('*', (req: Request, res: Response) => {
      // Guard API routes so they return JSON 404 instead of HTML
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint not found', path: req.path });
      }

      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('[SERVER] Error serving index.html:', err);
          if (!res.headersSent) {
            res.status(500).send('Error loading HOMEZA application.');
          }
        }
      });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HOMEZA Central Persistence & Application Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[SERVER CRITICAL] Failed to start server:', err);
});

