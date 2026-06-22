import path from "path";
import fs from "fs";
import pg from "pg";

const DB_PATH = path.join(process.cwd(), "barbershop.db");

const NEON_URL = "postgresql://neondb_owner:npg_bNrP0q2XTEju@ep-mute-dream-ab1th949-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

let isPgActive = true; // Always utilize Postgres as the primary persistent cloud store

let pgPool: pg.Pool | null = null;
function getPgPool() {
  if (!pgPool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || NEON_URL;
    const useSsl = connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");
    pgPool = new pg.Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000 // 5 seconds connection timeout
    });
  }
  return pgPool;
}

let sqliteDb: any = null;
async function getSqliteDb() {
  if (!sqliteDb) {
    const sqlite3ModuleName = "sqlite3";
    const sqlite3 = (await import(sqlite3ModuleName)).default;
    sqliteDb = new sqlite3.Database(DB_PATH);
  }
  return sqliteDb;
}

// SQL translator helper from SQLite/SQLite3 syntax to PostgreSQL syntax
export function translateSqlForPg(sql: string): string {
  let pgSql = sql;

  // Replace INSERT OR IGNORE INTO
  if (pgSql.includes("INSERT OR IGNORE INTO barber_shops")) {
    pgSql = pgSql.replace("INSERT OR IGNORE INTO barber_shops", "INSERT INTO barber_shops");
    if (!pgSql.toUpperCase().includes("ON CONFLICT")) {
      pgSql += " ON CONFLICT (id) DO NOTHING";
    }
  } else if (pgSql.includes("INSERT OR IGNORE INTO settings")) {
    pgSql = pgSql.replace("INSERT OR IGNORE INTO settings", "INSERT INTO settings");
    if (!pgSql.toUpperCase().includes("ON CONFLICT")) {
      pgSql += " ON CONFLICT (barbearia_id) DO NOTHING";
    }
  }

  // Replace INSERT OR REPLACE INTO master_credentials
  if (pgSql.includes("INSERT OR REPLACE INTO master_credentials")) {
    pgSql = pgSql.replace("INSERT OR REPLACE INTO master_credentials", "INSERT INTO master_credentials");
    if (!pgSql.toUpperCase().includes("ON CONFLICT")) {
      pgSql += " ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, is_first_access_done = EXCLUDED.is_first_access_done, reset_token = EXCLUDED.reset_token, reset_token_expires = EXCLUDED.reset_token_expires";
    }
  }

  // Replace standard parameters "?" with "$1", "$2", etc.
  let index = 1;
  pgSql = pgSql.replace(/\?/g, () => `$${index++}`);

  return pgSql;
}

// Promise-based helpers with automatic SQLite fallback
export async function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  if (isPgActive) {
    try {
      const pool = getPgPool();
      const pgSql = translateSqlForPg(sql);
      const res = await pool.query(pgSql, params);
      return { lastID: 0, changes: res.rowCount ?? 0 };
    } catch (err) {
      console.error("🚨 Postgres 'run' query failed:", err);
      throw err; // Throw error directly so we don't silently switch to SQLite on read-only Vercel
    }
  }

  // Fallback to SQLite
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err: any) {
      if (err) reject(err);
      else resolve({ lastID: (this as any)?.lastID ?? 0, changes: (this as any)?.changes ?? 0 });
    });
  });
}

export async function get<T>(sql: string, params: any[] = []): Promise<T | null> {
  if (isPgActive) {
    try {
      const pool = getPgPool();
      const pgSql = translateSqlForPg(sql);
      const res = await pool.query(pgSql, params);
      const row = res.rows[0];
      if (!row) return null;

      const normalizedRow = { ...row };
      for (const key of Object.keys(normalizedRow)) {
        if (key === 'count') {
          normalizedRow[key] = Number(normalizedRow[key]);
        }
        if (typeof normalizedRow[key] === 'boolean') {
          normalizedRow[key] = normalizedRow[key] ? 1 : 0;
        }
      }
      return normalizedRow as T;
    } catch (err) {
      console.error("🚨 Postgres 'get' query failed:", err);
      throw err; // Throw error directly
    }
  }

  // Fallback to SQLite
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve((row as T) || null);
    });
  });
}

export async function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  if (isPgActive) {
    try {
      const pool = getPgPool();
      const pgSql = translateSqlForPg(sql);
      const res = await pool.query(pgSql, params);
      return res.rows.map(row => {
        const normalizedRow = { ...row };
        for (const key of Object.keys(normalizedRow)) {
          if (key === 'count') {
            normalizedRow[key] = Number(normalizedRow[key]);
          }
          if (typeof normalizedRow[key] === 'boolean') {
            normalizedRow[key] = normalizedRow[key] ? 1 : 0;
          }
        }
        return normalizedRow as T;
      });
    } catch (err) {
      console.error("🚨 Postgres 'all' query failed:", err);
      throw err; // Throw error directly
    }
  }

  // Fallback to SQLite
  const db = await getSqliteDb();
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve((rows as T[]) || []);
    });
  });
}


// Generate secure 12-char key
function generateRandomSecureLicense(): string {
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specials = "@#$!";
  const allChars = uppers + lowers + digits + specials;
  
  let password = "";
  password += uppers[Math.floor(Math.random() * uppers.length)];
  password += lowers[Math.floor(Math.random() * lowers.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

let initDbPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  if (!initDbPromise) {
    initDbPromise = initDB().catch(err => {
      initDbPromise = null; // Clear cached promise on failure so we can retry!
      throw err;
    });
  }
  return initDbPromise;
}

export async function initDB() {
  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS barber_shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      custom_domain TEXT,
      monthly_license_keys TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      barbearia_id TEXT PRIMARY KEY,
      name TEXT,
      address TEXT,
      instagram TEXT,
      facebook TEXT,
      logo_url TEXT,
      thank_you_message TEXT,
      announcement_duration INTEGER DEFAULT 5,
      system_test_enabled INTEGER DEFAULT 0,
      system_test_start_date TEXT,
      system_test_duration_days INTEGER DEFAULT 7,
      system_test_password TEXT,
      color_palette TEXT,
      background_theme TEXT,
      send_instagram INTEGER DEFAULT 1,
      send_facebook INTEGER DEFAULT 1,
      stripe_publishable_key TEXT,
      stripe_secret_key TEXT,
      service_price REAL,
      salon_latitude REAL,
      salon_longitude REAL,
      is_online INTEGER DEFAULT 1,
      FOREIGN KEY (barbearia_id) REFERENCES barber_shops(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS barbers (
      id TEXT PRIMARY KEY,
      barbearia_id TEXT NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      FOREIGN KEY (barbearia_id) REFERENCES barber_shops(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      barbearia_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (barbearia_id) REFERENCES barber_shops(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      barbearia_id TEXT NOT NULL,
      number TEXT,
      name TEXT,
      adults_count INTEGER,
      kids_count INTEGER,
      service_id TEXT,
      service_name TEXT,
      barber_id TEXT,
      barber_name TEXT,
      estimated_time INTEGER,
      price REAL,
      status TEXT,
      created_at TEXT,
      called_at TEXT,
      completed_at TEXT,
      messages TEXT,
      stripe_session_id TEXT,
      prepaid_amount REAL,
      accepted_terms INTEGER DEFAULT 0,
      checked_in INTEGER DEFAULT 0,
      latitude REAL,
      longitude REAL,
      distance_to_salon REAL,
      checked_in_at TEXT,
      FOREIGN KEY (barbearia_id) REFERENCES barber_shops(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS master_credentials (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT,
      password_hash TEXT,
      is_first_access_done INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires BIGINT
    )
  `);

  // Migrate is_online column if table already exists
  try {
    await run(`ALTER TABLE settings ADD COLUMN is_online INTEGER DEFAULT 1`);
    console.log("Migration: Added is_online column to settings successfully.");
  } catch (err) {
    // If column already exists or similar error, ignore it
  }

  // Migrate or populate default data if empty
  const shopCount = await get<{ count: number }>("SELECT COUNT(*) as count FROM barber_shops");
  if (shopCount && shopCount.count === 0) {
    const STORE_PATH = path.join(process.cwd(), "barbershop-store.json");
    if (fs.existsSync(STORE_PATH)) {
      try {
        console.log("Migrating barbershop-store.json to SQLite DB...");
        const raw = fs.readFileSync(STORE_PATH, "utf-8");
        const json = JSON.parse(raw);
        
        // Migrate shops
        const shops = json.barberShops || [];
        for (const shop of shops) {
          const keys = shop.monthlyLicenseKeys || {};
          // generate keys if empty
          const currentYear = new Date().getFullYear();
          for (let m = 1; m <= 12; m++) {
            const key = `${currentYear}-${m.toString().padStart(2, '0')}`;
            if (!keys[key]) {
              keys[key] = generateRandomSecureLicense();
            }
          }

          await run(
            `INSERT INTO barber_shops (id, name, active, custom_domain, monthly_license_keys, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              shop.id,
              shop.name,
              shop.active ? 1 : 0,
              shop.customDomain || null,
              JSON.stringify(keys),
              shop.createdAt || new Date().toISOString()
            ]
          );

          // settings
          const s = shop.settings || {};
          await run(
            `INSERT INTO settings (
               barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
               system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
               color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
               stripe_secret_key, service_price, salon_latitude, salon_longitude
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              shop.id,
              s.name || shop.name,
              s.address || "RUA EXEMPLO, 123",
              s.instagram || "",
              s.facebook || "",
              s.logoUrl || "https://images.unsplash.com/photo-1503951914875-452162b0f3f1",
              s.thankYouMessage || "OBRIGADO!",
              s.announcementDuration !== undefined ? s.announcementDuration : 5,
              s.systemTestEnabled ? 1 : 0,
              s.systemTestStartDate || "",
              s.systemTestDurationDays !== undefined ? s.systemTestDurationDays : 7,
              s.systemTestPassword || generateRandomSecureLicense(),
              s.colorPalette || "emerald",
              s.backgroundTheme || "default",
              s.sendInstagram !== false ? 1 : 0,
              s.sendFacebook !== false ? 1 : 0,
              s.stripePublishableKey || "",
              s.stripeSecretKey || "",
              s.servicePrice !== undefined ? s.servicePrice : 35.0,
              s.salonLatitude !== undefined ? s.salonLatitude : 38.7223,
              s.salonLongitude !== undefined ? s.salonLongitude : -9.1393
            ]
          );

          // barbers
          for (const barber of (shop.barbers || [])) {
            await run(
              `INSERT INTO barbers (id, barbearia_id, name, active) VALUES (?, ?, ?, ?)`,
              [barber.id, shop.id, barber.name, barber.active ? 1 : 0]
            );
          }

          // services
          for (const service of (shop.services || [])) {
            await run(
              `INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES (?, ?, ?, ?, ?, ?)`,
              [service.id, shop.id, service.name, service.price, service.duration, service.type]
            );
          }

          // tickets
          for (const ticket of (shop.tickets || [])) {
            await run(
              `INSERT INTO tickets (
                 id, barbearia_id, number, name, adults_count, kids_count, service_id, service_name,
                 barber_id, barber_name, estimated_time, price, status, created_at, called_at, completed_at,
                 messages, stripe_session_id, prepaid_amount, accepted_terms, checked_in, latitude, longitude,
                 distance_to_salon, checked_in_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                ticket.id,
                shop.id,
                ticket.number || "",
                ticket.name || "",
                ticket.adultsCount || 0,
                ticket.kidsCount || 0,
                ticket.serviceId || "",
                ticket.serviceName || "",
                ticket.barberId || "",
                ticket.barberName || "",
                ticket.estimatedTime || 0,
                ticket.price || 0,
                ticket.status || "AGUARDANDO",
                ticket.createdAt || "",
                ticket.calledAt || null,
                ticket.completedAt || null,
                JSON.stringify(ticket.messages || []),
                ticket.stripeSessionId || null,
                ticket.prepaidAmount || 0,
                ticket.accepted_terms ? 1 : 0,
                ticket.checkedIn ? 1 : 0,
                ticket.latitude !== undefined ? ticket.latitude : null,
                ticket.longitude !== undefined ? ticket.longitude : null,
                ticket.distanceToSalon !== undefined ? ticket.distanceToSalon : null,
                ticket.checkedInAt || null
              ]
            );
          }
        }

        // master credentials
        const m = json.masterCredentials || {};
        await run(
          `INSERT INTO master_credentials (id, username, email, password_hash, is_first_access_done, reset_token, reset_token_expires)
           VALUES ('singleton', ?, ?, ?, ?, ?, ?)`,
          [
            m.username || "admin",
            m.email || "",
            m.passwordHash || "",
            m.isFirstAccessDone ? 1 : 0,
            m.resetToken || null,
            m.resetTokenExpires || null
          ]
        );

        console.log("Migration to SQLite completed successfully!");
      } catch (err) {
        console.error("Error migrating JSON to SQLite:", err);
      }
    } else {
      // Create default original shop
      const defaultId = "matriz";
      const keys: Record<string, string> = {};
      const currentYear = new Date().getFullYear();
      for (let m = 1; m <= 12; m++) {
        keys[`${currentYear}-${m.toString().padStart(2, '0')}`] = generateRandomSecureLicense();
      }

      await run(
        `INSERT INTO barber_shops (id, name, active, custom_domain, monthly_license_keys, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [defaultId, "Matriz", 1, null, JSON.stringify(keys), new Date().toISOString()]
      );

      const defaultMatrizTestPassSeed = generateRandomSecureLicense();

      await run(
        `INSERT INTO settings (
           barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
           system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
           color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
           stripe_secret_key, service_price, salon_latitude, salon_longitude
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          defaultId,
          "Matriz",
          "RUA EXEMPLO, 123",
          "",
          "",
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1",
          "OBRIGADO!",
          5,
          0,
          "",
          7,
          defaultMatrizTestPassSeed,
          "emerald",
          "default",
          1,
          1,
          "",
          "",
          35.0,
          38.7223,
          -9.1393
        ]
      );

      await run(`INSERT INTO barbers (id, barbearia_id, name, active) VALUES ('barber-1', 'matriz', 'BARBEIRO 1', 1)`);
      await run(`INSERT INTO barbers (id, barbearia_id, name, active) VALUES ('barber-2', 'matriz', 'NOVO BARBEIRO', 1)`);

      await run(`INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES ('srv-1', 'matriz', 'CORTE', 35.0, 30, 'adult')`);
      await run(`INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES ('srv-2', 'matriz', 'CORTE KIDS', 25.0, 25, 'kids')`);

      await run(
        `INSERT INTO master_credentials (id, username, email, password_hash, is_first_access_done)
         VALUES ('singleton', 'admin', '', '', 0)`
      );
    }
  }

  // Always ensure 'matriz' shop exists in barber_shops
  try {
    const checkMatriz = await get<{ id: string }>("SELECT id FROM barber_shops WHERE id = 'matriz'");
    if (!checkMatriz) {
      console.log("Seeding default 'matriz' shop...");
      const keys: Record<string, string> = {};
      const currentYear = new Date().getFullYear();
      for (let m = 1; m <= 12; m++) {
        keys[`${currentYear}-${m.toString().padStart(2, '0')}`] = generateRandomSecureLicense();
      }

      await run(
        `INSERT INTO barber_shops (id, name, active, custom_domain, monthly_license_keys, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ["matriz", "Matriz", 1, null, JSON.stringify(keys), new Date().toISOString()]
      );

      const defaultMatrizTestPass = generateRandomSecureLicense();

      // insert default settings
      await run(
        `INSERT INTO settings (
           barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
           system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
           color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
           stripe_secret_key, service_price, salon_latitude, salon_longitude
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "matriz",
          "Matriz",
          "RUA EXEMPLO, 123",
          "",
          "",
          "https://images.unsplash.com/photo-1503951914875-452162b0f3f1",
          "OBRIGADO!",
          5,
          0,
          "",
          7,
          defaultMatrizTestPass,
          "emerald",
          "default",
          1,
          1,
          "",
          "",
          35.0,
          38.7223,
          -9.1393
        ]
      );

      await run(`INSERT INTO barbers (id, barbearia_id, name, active) VALUES ('barber-1', 'matriz', 'BARBEIRO 1', 1)`);
      await run(`INSERT INTO barbers (id, barbearia_id, name, active) VALUES ('barber-2', 'matriz', 'NOVO BARBEIRO', 1)`);

      await run(`INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES ('srv-1', 'matriz', 'CORTE', 35.0, 30, 'adult')`);
      await run(`INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES ('srv-2', 'matriz', 'CORTE KIDS', 25.0, 25, 'kids')`);
    }
  } catch (err) {
    console.error("Failed to ensure 'matriz' shop exists:", err);
  }

  // Always ensure default master credential exists
  try {
    const checkMaster = await get<{ id: string }>("SELECT id FROM master_credentials WHERE id = 'singleton'");
    if (!checkMaster) {
      await run(
        `INSERT INTO master_credentials (id, username, email, password_hash, is_first_access_done)
         VALUES ('singleton', 'admin', '', '', 0)`
      );
    }
  } catch (err) {
    console.error("Failed to ensure master credentials exist:", err);
  }

  // Automatically delete the legacy 'default' shop if it exists to maintain only the 'matriz' shop
  try {
    const checkDefault = await get<{ id: string }>("SELECT id FROM barber_shops WHERE id = 'default'");
    if (checkDefault) {
      console.log("Cleaning up and deleting legacy 'default' shop...");
      await run(`DELETE FROM settings WHERE barbearia_id = 'default'`);
      await run(`DELETE FROM barbers WHERE barbearia_id = 'default'`);
      await run(`DELETE FROM services WHERE barbearia_id = 'default'`);
      await run(`DELETE FROM tickets WHERE barbearia_id = 'default'`);
      await run(`DELETE FROM barber_shops WHERE id = 'default'`);
      console.log("Legacy 'default' shop deleted successfully.");
    }
  } catch (err) {
    console.error("Failed to clean up legacy default shop:", err);
  }

  // Automatically migrate any existing 'TESTE123' passwords to a randomized secure license password
  try {
    const existingSettings = await all<{ barbearia_id: string; system_test_password: string }>(
      "SELECT barbearia_id, system_test_password FROM settings"
    );
    for (const row of existingSettings) {
      if (!row.system_test_password || row.system_test_password === "TESTE123") {
        const secureRandomPass = generateRandomSecureLicense();
        await run(
          "UPDATE settings SET system_test_password = ? WHERE barbearia_id = ?",
          [secureRandomPass, row.barbearia_id]
        );
        console.log(`Migrated legacy test password for shop '${row.barbearia_id}' to a random secure password.`);
      }
    }
  } catch (err) {
    console.error("Failed to migrate existing settings test passwords:", err);
  }

  // Automatically fill any missing monthly license keys for all barber shops
  try {
    const shops = await all<{ id: string; monthly_license_keys: string }>(
      "SELECT id, monthly_license_keys FROM barber_shops"
    );
    const currentYear = new Date().getFullYear();
    for (const shop of shops) {
      let keys: Record<string, string> = {};
      try {
        if (shop.monthly_license_keys) {
          keys = JSON.parse(shop.monthly_license_keys);
        }
      } catch (e) {}

      let updated = false;
      // Ensure current year keys are registered
      for (let m = 1; m <= 12; m++) {
        const key = `${currentYear}-${m.toString().padStart(2, '0')}`;
        if (!keys[key]) {
          keys[key] = generateRandomSecureLicense();
          updated = true;
        }
      }
      // Ensure next year keys are registered
      for (let m = 1; m <= 12; m++) {
        const key = `${currentYear + 1}-${m.toString().padStart(2, '0')}`;
        if (!keys[key]) {
          keys[key] = generateRandomSecureLicense();
          updated = true;
        }
      }

      if (updated) {
        await run(
          "UPDATE barber_shops SET monthly_license_keys = ? WHERE id = ?",
          [JSON.stringify(keys), shop.id]
        );
        console.log(`Successfully generated and migrated monthly license keys for shop '${shop.id}'`);
      }
    }
  } catch (err) {
    console.error("Failed to migrate existing barber shops monthly license keys:", err);
  }
}
