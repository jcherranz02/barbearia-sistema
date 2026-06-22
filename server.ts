import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import AdmZip from "adm-zip";
import { initDB, run, get, all, ensureDbInitialized } from "./db";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const STORE_PATH = path.join(process.cwd(), "barbershop-store.json");

// Middleware to ensure database is fully initialized before any API request is executed
const ensureDbMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    await ensureDbInitialized();
    next();
  } catch (err: any) {
    console.error("Database initialization failed in middleware:", err);
    res.status(500).json({ error: "Erro de inicialização do banco de dados", details: err.message });
  }
};

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/api", ensureDbMiddleware);

// Type declarations
interface Barber {
  id: string;
  name: string;
  active: boolean;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  type: 'adult' | 'kids';
}

interface ChatMessage {
  id: string;
  sender: 'client' | 'barber';
  text: string;
  timestamp: string;
}

interface QueueTicket {
  id: string;
  number: string;
  name: string;
  adultsCount: number;
  kidsCount: number;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  estimatedTime: number;
  price: number;
  status: 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'CHAMADO' | 'FINALIZADO' | 'CANCELADO' | 'NAO_COMPARECEU';
  createdAt: string;
  calledAt?: string;
  completedAt?: string;
  messages?: ChatMessage[];
  stripeSessionId?: string;
  prepaidAmount?: number;
  accepted_terms?: boolean;
  checkedIn?: boolean;
  latitude?: number;
  longitude?: number;
  distanceToSalon?: number;
  checkedInAt?: string;
}

interface BarbershopSettings {
  name: string;
  address: string;
  instagram: string;
  facebook: string;
  logoUrl: string;
  thankYouMessage: string;
  announcementDuration?: number;
  systemTestEnabled?: boolean;
  systemTestStartDate?: string;
  systemTestDurationDays?: number;
  systemTestPassword?: string;
  colorPalette?: string;
  backgroundTheme?: string;
  sendInstagram?: boolean;
  sendFacebook?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  servicePrice?: number;
  salonLatitude?: number;
  salonLongitude?: number;
  isOnline?: boolean;
}

interface MasterCredentials {
  username: string;
  email?: string;
  passwordHash?: string;
  isFirstAccessDone: boolean;
  resetToken?: string;
  resetTokenExpires?: number;
}

interface BarberShop {
  id: string; // url-safe slug, lowercase, trimmed
  name: string;
  active: boolean;
  createdAt: string;
  settings: BarbershopSettings;
  barbers: Barber[];
  services: Service[];
  tickets: QueueTicket[];
}

interface AppState {
  settings: BarbershopSettings;
  barbers: Barber[];
  services: Service[];
  tickets: QueueTicket[];
  barberShops?: BarberShop[];
  masterCredentials?: MasterCredentials;
  monthlyLicenseKeys?: Record<string, string>;
}

// Initial state matching design images
const defaultState: AppState = {
  settings: {
    name: "JCHFDKJLSK",
    address: "RUA EXEMPLO, 123 - CENTRO",
    instagram: "https://instagram.com/eliseubarber",
    facebook: "https://facebook.com/eliseubarber",
    logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    thankYouMessage: "OBRIGADO PELA PREFERÊNNCIA! SIGA NOSSAS REDES SOCIAIS.",
    announcementDuration: 5,
    systemTestEnabled: false,
    systemTestStartDate: "",
    systemTestDurationDays: 7,
    systemTestPassword: "TESTE123",
    colorPalette: "emerald",
    backgroundTheme: "default",
    sendInstagram: true,
    sendFacebook: true,
    stripePublishableKey: "",
    stripeSecretKey: "",
    servicePrice: 35.0,
    salonLatitude: 38.7223,
    salonLongitude: -9.1393
  },
  barbers: [
    { id: "barber-1", name: "BARBEIRO 1", active: true },
    { id: "barber-2", name: "NOVO BARBEIRO", active: true }
  ],
  services: [
    { id: "srv-1", name: "CORTE", price: 35.0, duration: 30, type: "adult" },
    { id: "srv-2", name: "CORTE KIDS", price: 25.0, duration: 25, type: "kids" }
  ],
  tickets: [
    {
      id: "tkt-1",
      number: "#001",
      name: "LUCAS",
      adultsCount: 1,
      kidsCount: 0,
      serviceId: "srv-1",
      serviceName: "CORTE ADULTO",
      barberId: "barber-1",
      barberName: "BARBEIRO 1",
      estimatedTime: 30,
      price: 35.00,
      status: "FINALIZADO",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
      calledAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      completedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      id: "tkt-2",
      number: "#002",
      name: "PEDRO",
      adultsCount: 0,
      kidsCount: 2,
      serviceId: "srv-2",
      serviceName: "CORTE CRIANÇA",
      barberId: "barber-1",
      barberName: "BARBEIRO 1",
      estimatedTime: 25,
      price: 15.00,
      status: "CANCELADO",
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(), // 1 hour ago
    },
    {
      id: "tkt-3",
      number: "#002",
      name: "PEREZ",
      adultsCount: 0,
      kidsCount: 1,
      serviceId: "srv-2",
      serviceName: "CORTE CRIANÇA",
      barberId: "barber-1",
      barberName: "BARBEIRO 1",
      estimatedTime: 25,
      price: 15.00,
      status: "AGUARDANDO",
      createdAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
    }
  ],
  masterCredentials: {
    username: "admin",
    email: "",
    passwordHash: "",
    isFirstAccessDone: false
  }
};

// Helper to generate completely random, secure 12-char license key meeting complexity specs
function generateRandomSecureLicense(): string {
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specials = "@#$!";
  const allChars = uppers + lowers + digits + specials;
  
  // Guarantee complexity requirements
  let password = "";
  password += uppers[Math.floor(Math.random() * uppers.length)];
  password += lowers[Math.floor(Math.random() * lowers.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += specials[Math.floor(Math.random() * specials.length)];
  
  for (let i = 0; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

let state: any = { barberShops: [] };

initDB().catch(console.error);

async function getTenant(req: express.Request): Promise<{ tenant: any | null; error?: string }> {
  await ensureDbInitialized();
  const host = (req.headers.host || "").toLowerCase().trim();
  const hostName = host.split(":")[0];

  let shopId = (req.query.shopId || req.query.shop || req.headers["x-barbershop-id"] || "matriz") as string;
  shopId = shopId.trim().toLowerCase();

  // 1. Try search by custom_domain first
  let shopRow = await get<any>("SELECT * FROM barber_shops WHERE LOWER(custom_domain) = ?", [hostName]);
  if (!shopRow && shopId) {
    shopRow = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [shopId]);
  }

  // Fallback to make sure default exists
  if (!shopRow && shopId === "matriz") {
    const keys: Record<string, string> = {};
    const currentYear = new Date().getFullYear();
    for (let m = 1; m <= 12; m++) {
      keys[`${currentYear}-${m.toString().padStart(2, '0')}`] = generateRandomSecureLicense();
    }
    await run(
      `INSERT OR IGNORE INTO barber_shops (id, name, active, custom_domain, monthly_license_keys, created_at)
       VALUES ('matriz', 'Matriz', 1, NULL, ?, ?)`,
      [JSON.stringify(keys), new Date().toISOString()]
    );
    await run(
      `INSERT OR IGNORE INTO settings (
         barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
         system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
         color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
         stripe_secret_key, service_price, salon_latitude, salon_longitude
       ) VALUES ('matriz', 'Matriz', 'RUA EXEMPLO, 123', '', '', '', '', 5, 0, '', 7, ?, 'emerald', 'default', 1, 1, '', '', 35.0, 38.7223, -9.1393)`,
      [generateRandomSecureLicense()]
    );
    shopRow = await get<any>("SELECT * FROM barber_shops WHERE id = 'matriz'");
  }

  if (!shopRow) {
    return { tenant: null, error: `Barbearia não encontrada.` };
  }

  if (shopRow.active === 0) {
    return { 
      tenant: {
        id: shopRow.id,
        name: shopRow.name,
        active: false,
        settings: { name: "Acesso Suspenso", address: "Esta barbearia encontra-se bloqueada ou suspensa pelo administrador." },
        barbers: [],
        services: [],
        tickets: []
      }, 
      error: `Acesso bloqueado para a barbearia "${shopRow.name}".` 
    };
  }

  // Fetch related tables
  const settingsRow = await get<any>("SELECT * FROM settings WHERE barbearia_id = ?", [shopRow.id]);
  const barbersList = await all<any>("SELECT * FROM barbers WHERE barbearia_id = ?", [shopRow.id]);
  const servicesList = await all<any>("SELECT * FROM services WHERE barbearia_id = ?", [shopRow.id]);
  const ticketsList = await all<any>("SELECT * FROM tickets WHERE barbearia_id = ?", [shopRow.id]);

  // Map settings
  const settings = settingsRow ? {
    name: settingsRow.name,
    address: settingsRow.address,
    instagram: settingsRow.instagram,
    facebook: settingsRow.facebook,
    logoUrl: settingsRow.logo_url,
    thankYouMessage: settingsRow.thank_you_message,
    announcementDuration: settingsRow.announcement_duration,
    systemTestEnabled: settingsRow.system_test_enabled === 1,
    systemTestStartDate: settingsRow.system_test_start_date,
    systemTestDurationDays: settingsRow.system_test_duration_days,
    systemTestPassword: settingsRow.system_test_password,
    colorPalette: settingsRow.color_palette,
    backgroundTheme: settingsRow.background_theme,
    sendInstagram: settingsRow.send_instagram === 1,
    sendFacebook: settingsRow.send_facebook === 1,
    stripePublishableKey: settingsRow.stripe_publishable_key,
    stripeSecretKey: settingsRow.stripe_secret_key,
    servicePrice: settingsRow.service_price,
    salonLatitude: settingsRow.salon_latitude,
    salonLongitude: settingsRow.salon_longitude,
    isOnline: settingsRow.is_online !== 0
  } : {};

  const barbers = barbersList.map(b => ({
    id: b.id,
    name: b.name,
    active: b.active === 1
  }));

  const services = servicesList.map(s => ({
    id: s.id,
    name: s.name,
    price: s.price,
    duration: s.duration,
    type: s.type
  }));

  const tickets = ticketsList.map(t => ({
    id: t.id,
    number: t.number,
    name: t.name,
    adultsCount: t.adults_count,
    kidsCount: t.kids_count,
    serviceId: t.service_id,
    serviceName: t.service_name,
    barberId: t.barber_id,
    barberName: t.barber_name,
    estimatedTime: t.estimated_time,
    price: t.price,
    status: t.status,
    createdAt: t.created_at,
    calledAt: t.called_at,
    completedAt: t.completed_at,
    messages: JSON.parse(t.messages || "[]"),
    stripeSessionId: t.stripe_session_id,
    prepaidAmount: t.prepaid_amount,
    accepted_terms: t.accepted_terms === 1,
    checkedIn: t.checked_in === 1,
    latitude: t.latitude,
    longitude: t.longitude,
    distanceToSalon: t.distance_to_salon,
    checkedInAt: t.checked_in_at
  }));

  let monthlyLicenseKeys = {};
  try {
    monthlyLicenseKeys = JSON.parse(shopRow.monthly_license_keys || "{}");
  } catch(e){}

  return {
    tenant: {
      id: shopRow.id,
      name: shopRow.name,
      active: shopRow.active === 1,
      customDomain: shopRow.custom_domain,
      monthlyLicenseKeys,
      settings,
      barbers,
      services,
      tickets
    }
  };
}

async function saveTenant(tenant: any): Promise<void> {
  const shopId = tenant.id;

  await run(
    `UPDATE barber_shops 
     SET name = ?, active = ?, custom_domain = ?, monthly_license_keys = ? 
     WHERE id = ?`,
    [
      tenant.name,
      tenant.active ? 1 : 0,
      tenant.customDomain || null,
      JSON.stringify(tenant.monthlyLicenseKeys || {}),
      shopId
    ]
  );

  const s = tenant.settings || {};
  await run(
    `INSERT INTO settings (
       barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
       system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
       color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
       stripe_secret_key, service_price, salon_latitude, salon_longitude, is_online
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(barbearia_id) DO UPDATE SET
       name = excluded.name,
       address = excluded.address,
       instagram = excluded.instagram,
       facebook = excluded.facebook,
       logo_url = excluded.logo_url,
       thank_you_message = excluded.thank_you_message,
       announcement_duration = excluded.announcement_duration,
       system_test_enabled = excluded.system_test_enabled,
       system_test_start_date = excluded.system_test_start_date,
       system_test_duration_days = excluded.system_test_duration_days,
       system_test_password = excluded.system_test_password,
       color_palette = excluded.color_palette,
       background_theme = excluded.background_theme,
       send_instagram = excluded.send_instagram,
       send_facebook = excluded.send_facebook,
       stripe_publishable_key = excluded.stripe_publishable_key,
       stripe_secret_key = excluded.stripe_secret_key,
       service_price = excluded.service_price,
       salon_latitude = excluded.salon_latitude,
       salon_longitude = excluded.salon_longitude,
       is_online = excluded.is_online`,
    [
      shopId,
      s.name || tenant.name,
      s.address || "RUA EXEMPLO, 123",
      s.instagram || "",
      s.facebook || "",
      s.logoUrl || "",
      s.thankYouMessage || "",
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
      s.salonLongitude !== undefined ? s.salonLongitude : -9.1393,
      s.isOnline !== false ? 1 : 0
    ]
  );

  await run(`DELETE FROM barbers WHERE barbearia_id = ?`, [shopId]);
  for (const b of (tenant.barbers || [])) {
    await run(
      `INSERT INTO barbers (id, barbearia_id, name, active) VALUES (?, ?, ?, ?)`,
      [b.id, shopId, b.name, b.active ? 1 : 0]
    );
  }

  await run(`DELETE FROM services WHERE barbearia_id = ?`, [shopId]);
  for (const svc of (tenant.services || [])) {
    await run(
      `INSERT INTO services (id, barbearia_id, name, price, duration, type) VALUES (?, ?, ?, ?, ?, ?)`,
      [svc.id, shopId, svc.name, svc.price, svc.duration, svc.type]
    );
  }

  await run(`DELETE FROM tickets WHERE barbearia_id = ?`, [shopId]);
  for (const t of (tenant.tickets || [])) {
    await run(
      `INSERT INTO tickets (
         id, barbearia_id, number, name, adults_count, kids_count, service_id, service_name,
         barber_id, barber_name, estimated_time, price, status, created_at, called_at, completed_at,
         messages, stripe_session_id, prepaid_amount, accepted_terms, checked_in, latitude, longitude,
         distance_to_salon, checked_in_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        t.id,
        shopId,
        t.number || "",
        t.name || "",
        t.adultsCount || 0,
        t.kidsCount || 0,
        t.serviceId || "",
        t.serviceName || "",
        t.barberId || "",
        t.barberName || "",
        t.estimatedTime || 0,
        t.price || 0,
        t.status || "AGUARDANDO",
        t.createdAt || "",
        t.calledAt || null,
        t.completedAt || null,
        JSON.stringify(t.messages || []),
        t.stripeSessionId || null,
        t.prepaidAmount || 0,
        t.accepted_terms ? 1 : 0,
        t.checkedIn ? 1 : 0,
        t.latitude !== undefined ? t.latitude : null,
        t.longitude !== undefined ? t.longitude : null,
        t.distanceToSalon !== undefined ? t.distanceToSalon : null,
        t.checkedInAt || null
      ]
    );
  }
}

// Helper to generate dynamic licensing code for an arbitrary date
// Formula: "CORTE" + MM + YY + (last digit of Month Index + 1)
function getLicensingCode(date: Date): string {
  const monthNum = date.getMonth() + 1; // 1-12
  const monthStr = monthNum.toString().padStart(2, '0');
  const yearStr = date.getFullYear().toString().slice(-2);
  const suffix = (monthNum % 10).toString();
  return `CORTE${monthStr}${yearStr}${suffix}`;
}

// REST API endpoints

// Download complete workspace source code as a ZIP archive
app.get("/api/download-zip", (req, res) => {
  try {
    const zip = new AdmZip();
    const rootDir = process.cwd();

    const excludeDirs = ["node_modules", "dist", ".git", ".next", ".cache", "build"];
    const excludeFiles = ["barbershop.db", "barbershop.db-journal", "app.zip", "package-lock.json"];

    function addFolderRecursive(currentDir: string, zipPath: string = "") {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const relZipPath = zipPath ? `${zipPath}/${item}` : item;

        // Skip excluded directories, hidden files/dirs except standard configurations
        if (excludeDirs.includes(item) || (item.startsWith(".") && item !== ".env.example")) {
          continue;
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          addFolderRecursive(fullPath, relZipPath);
        } else if (stats.isFile()) {
          if (excludeFiles.includes(item)) {
            continue;
          }
          const content = fs.readFileSync(fullPath);
          zip.addFile(relZipPath, content);
        }
      }
    }

    addFolderRecursive(rootDir);

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=projeto-barbearia-completo.zip");
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error zipping workspace:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get Full State for Tenant
app.get("/api/state", async (req, res) => {
  try {
    const result = await getTenant(req);
    const masterCreds = await get<any>("SELECT * FROM master_credentials WHERE id = 'singleton'");
    const masterCredentials = masterCreds ? {
      username: masterCreds.username,
      email: masterCreds.email,
      isFirstAccessDone: masterCreds.is_first_access_done === 1
    } : undefined;

    if (result.error) {
      return res.json({ 
        error: result.error, 
        isBlocked: true,
        settings: { name: "Acesso Suspenso", address: "Esta barbearia encontra-se bloqueada ou suspensa pelo administrador." },
        barbers: [], 
        services: [], 
        tickets: [],
        masterCredentials
      });
    }
    
    const tenant = result.tenant!;
    const sanitizedTenant = JSON.parse(JSON.stringify(tenant));
    
    if (sanitizedTenant.settings && sanitizedTenant.settings.stripeSecretKey) {
      sanitizedTenant.settings.stripeSecretKey = "••••••••••••••••";
    }
    
    res.json({
      settings: sanitizedTenant.settings,
      barbers: sanitizedTenant.barbers,
      services: sanitizedTenant.services,
      tickets: sanitizedTenant.tickets,
      shopId: sanitizedTenant.id,
      shopName: sanitizedTenant.name,
      masterCredentials
    });
  } catch (error: any) {
    console.error("🚨 GET /api/state failed:", error);
    res.status(500).json({ error: "Erro interno do servidor ao obter dados da barbearia.", details: error.message });
  }
});

// Update Settings for Tenant
app.post("/api/settings", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const newSettings = req.body;
  if (newSettings && typeof newSettings === "object") {
    const mergedSettings = { ...newSettings };
    if (mergedSettings.stripeSecretKey === "••••••••••••••••" || mergedSettings.stripeSecretKey === "••••••••") {
      mergedSettings.stripeSecretKey = tenant.settings.stripeSecretKey;
    }
    tenant.settings = { ...tenant.settings, ...mergedSettings };
    await saveTenant(tenant);
    
    const sanitizedSettings = { ...tenant.settings };
    if (sanitizedSettings.stripeSecretKey) {
      sanitizedSettings.stripeSecretKey = "••••••••••••••••";
    }
    return res.json({ success: true, settings: sanitizedSettings });
  }
  res.status(400).json({ error: "Invalid data" });
});

// Add or Update Barber for Tenant
app.post("/api/barbers", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const barber = req.body;
  if (!barber.name) {
    return res.status(400).json({ error: "Barber name is required" });
  }

  if (barber.id) {
    const exists = tenant.barbers.some((b: any) => b.id === barber.id);
    if (exists) {
      tenant.barbers = tenant.barbers.map((b: any) => b.id === barber.id ? { ...b, ...barber } : b);
    } else {
      tenant.barbers.push({
        id: barber.id,
        name: barber.name,
        active: barber.active !== undefined ? barber.active : true
      });
    }
  } else {
    const newBarber: Barber = {
      id: "barber-" + Math.random().toString(36).substring(2, 9),
      name: barber.name,
      active: barber.active !== undefined ? barber.active : true
    };
    tenant.barbers.push(newBarber);
  }
  await saveTenant(tenant);
  res.json({ success: true, barbers: tenant.barbers });
});

// Delete Barber for Tenant
app.delete("/api/barbers/:id", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  tenant.barbers = tenant.barbers.filter((b: any) => b.id !== id);
  await saveTenant(tenant);
  res.json({ success: true, barbers: tenant.barbers });
});

// Add or Update Service for Tenant
app.post("/api/services", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const svc = req.body;
  if (!svc.name || !svc.price) {
    return res.status(400).json({ error: "Service name and price are required" });
  }

  if (svc.id) {
    const exists = tenant.services.some((s: any) => s.id === svc.id);
    if (exists) {
      tenant.services = tenant.services.map((s: any) => s.id === svc.id ? { ...s, ...svc, price: parseFloat(svc.price), duration: parseInt(svc.duration || 30) } : s);
    } else {
      tenant.services.push({
        id: svc.id,
        name: svc.name,
        price: parseFloat(svc.price),
        duration: parseInt(svc.duration || 30),
        type: svc.type === "kids" ? "kids" : "adult"
      });
    }
  } else {
    const newSvc: Service = {
      id: "srv-" + Math.random().toString(36).substring(2, 9),
      name: svc.name,
      price: parseFloat(svc.price),
      duration: parseInt(svc.duration || 30),
      type: svc.type === "kids" ? "kids" : "adult"
    };
    tenant.services.push(newSvc);
  }
  await saveTenant(tenant);
  res.json({ success: true, services: tenant.services });
});

// Delete Service for Tenant
app.delete("/api/services/:id", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  tenant.services = tenant.services.filter((s: any) => s.id !== id);
  await saveTenant(tenant);
  res.json({ success: true, services: tenant.services });
});

// Take Ticket (Customer Queue request)
app.post("/api/tickets", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  if (tenant.settings.isOnline === false) {
    return res.status(400).json({ error: "Desculpe! Esta barbearia está temporariamente offline para novos agendamentos no momento." });
  }

  const { name, adultsCount, kidsCount, serviceId, barberId, selectedAdultServices, selectedKidsServices, accepted_terms } = req.body;

  if (tenant.settings.stripeSecretKey && tenant.settings.stripeSecretKey.trim() !== "") {
    return res.status(400).json({ error: "O pagamento online está ativado nesta barbearia. É necessário realizar o pagamento via Stripe." });
  }

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const barber = tenant.barbers.find((b: any) => b.id === barberId);

  if (!barber) {
    return res.status(400).json({ error: "Barber not found" });
  }

  // Generate sequence ticket number (like #001, #002) based only on today's tickets
  const todayStr = new Date().toDateString();
  const todayTicketsCount = tenant.tickets.filter((t: any) => new Date(t.createdAt).toDateString() === todayStr).length;
  const nextNum = todayTicketsCount + 1;
  const numberStr = "#" + nextNum.toString().padStart(3, '0');

  // Calculate sum duration and price
  let totalPrice = 0;
  let estimatedTime = 0;
  const serviceNamesList: string[] = [];

  const defaultAdultSvc = tenant.services.find((s: any) => s.type === "adult") || tenant.services[0];
  const defaultKidsSvc = tenant.services.find((s: any) => s.type === "kids") || tenant.services[0];

  const adultSvcList: Service[] = [];
  const kidsSvcList: Service[] = [];

  const actualAdultsCount = adultsCount !== undefined ? adultsCount : 1;
  const actualKidsCount = kidsCount !== undefined ? kidsCount : 0;

  if (actualAdultsCount > 0) {
    for (let i = 0; i < actualAdultsCount; i++) {
      const sId = selectedAdultServices && selectedAdultServices[i];
      const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultAdultSvc;
      if (svc) {
        adultSvcList.push(svc);
      } else if (defaultAdultSvc) {
        adultSvcList.push(defaultAdultSvc);
      }
    }
  }

  if (actualKidsCount > 0) {
    for (let i = 0; i < actualKidsCount; i++) {
      const sId = selectedKidsServices && selectedKidsServices[i];
      const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultKidsSvc;
      if (svc) {
        kidsSvcList.push(svc);
      } else if (defaultKidsSvc) {
        kidsSvcList.push(defaultKidsSvc);
      }
    }
  }

  const allSelectedSvcs = [...adultSvcList, ...kidsSvcList];

  if (allSelectedSvcs.length > 0) {
    for (const s of allSelectedSvcs) {
      totalPrice += s.price;
      estimatedTime += s.duration;
      serviceNamesList.push(s.name);
    }
  } else {
    // Fallback
    const service = tenant.services.find((s: any) => s.id === serviceId) || defaultAdultSvc;
    const personCount = Math.max(1, actualAdultsCount + actualKidsCount);
    totalPrice = (service ? service.price : 35.0) * personCount;
    estimatedTime = (service ? service.duration : 30) * personCount;
    serviceNamesList.push(service ? service.name : "SERVIÇO");
  }

  const newTicket: QueueTicket = {
    id: "tkt-" + Math.random().toString(36).substring(2, 9),
    number: numberStr,
    name: name.toUpperCase(),
    adultsCount: actualAdultsCount,
    kidsCount: actualKidsCount,
    serviceId: serviceId || (allSelectedSvcs[0] ? allSelectedSvcs[0].id : "srv-1"),
    serviceName: serviceNamesList.join(" + ").toUpperCase(),
    barberId: barberId,
    barberName: barber.name,
    estimatedTime: estimatedTime,
    price: totalPrice,
    status: "AGUARDANDO",
    createdAt: new Date().toISOString(),
    accepted_terms: !!accepted_terms
  };

  tenant.tickets.push(newTicket);
  await saveTenant(tenant);

  res.json({ success: true, ticket: newTicket, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Stripe Create Payment Session
app.post("/api/payment/create-session", async (req, res) => {
  try {
    const result = await getTenant(req);
    if (result.error) return res.status(400).json({ error: result.error });
    const tenant = result.tenant!;

    if (tenant.settings.isOnline === false) {
      return res.status(400).json({ error: "Desculpe! Esta barbearia está temporariamente offline para novos agendamentos no momento." });
    }

    const { name, adultsCount, kidsCount, serviceId, barberId, selectedAdultServices, selectedKidsServices, accepted_terms } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório." });
    }

    const secretKey = tenant.settings.stripeSecretKey;
    if (!secretKey) {
      return res.status(400).json({ error: "O pagamento online não está configurado nesta barbearia (falta a Stripe Secret Key)." });
    }

    // Calculate total price of select services
    const defaultAdultSvc = tenant.services.find((s: any) => s.type === "adult") || tenant.services[0];
    const defaultKidsSvc = tenant.services.find((s: any) => s.type === "kids") || tenant.services[0];

    const actualAdultsCount = adultsCount !== undefined ? adultsCount : 1;
    const actualKidsCount = kidsCount !== undefined ? kidsCount : 0;

    let totalPrice = 0;
    const adultSvcList: Service[] = [];
    const kidsSvcList: Service[] = [];

    if (actualAdultsCount > 0) {
      for (let i = 0; i < actualAdultsCount; i++) {
        const sId = selectedAdultServices && selectedAdultServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultAdultSvc;
        if (svc) {
          adultSvcList.push(svc);
        } else if (defaultAdultSvc) {
          adultSvcList.push(defaultAdultSvc);
        }
      }
    }

    if (actualKidsCount > 0) {
      for (let i = 0; i < actualKidsCount; i++) {
        const sId = selectedKidsServices && selectedKidsServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultKidsSvc;
        if (svc) {
          kidsSvcList.push(svc);
        } else if (defaultKidsSvc) {
          kidsSvcList.push(defaultKidsSvc);
        }
      }
    }

    const allSelectedSvcs = [...adultSvcList, ...kidsSvcList];

    if (allSelectedSvcs.length > 0) {
      for (const s of allSelectedSvcs) {
        totalPrice += s.price;
      }
    } else {
      const service = tenant.services.find((s: any) => s.id === serviceId) || defaultAdultSvc;
      const personCount = Math.max(1, actualAdultsCount + actualKidsCount);
      totalPrice = (service ? service.price : 35.0) * personCount;
    }

    // Prepayment/Sinal is defined by servicePrice
    const configuredSinal = Number(tenant.settings.servicePrice) || 10.0;
    const finalPayAmount = Math.min(totalPrice, configuredSinal);
    const remainingAmount = totalPrice - finalPayAmount;

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16" as any
    });

    const ticketData = {
      name,
      adultsCount,
      kidsCount,
      serviceId,
      barberId,
      selectedAdultServices,
      selectedKidsServices,
      prepaidAmount: finalPayAmount,
      accepted_terms: !!accepted_terms
    };

    const host = req.get("host");
    const protocol = req.protocol;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Reserva de Agendamento - ${name.toUpperCase()}`,
              description: `Sinal Pago Online: £${finalPayAmount.toFixed(2)}. Falta pagar na barbearia: £${remainingAmount.toFixed(2)}. (Valor Total: £${totalPrice.toFixed(2)})`,
            },
            unit_amount: Math.round(finalPayAmount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${protocol}://${host}/api/payment/success?session_id={CHECKOUT_SESSION_ID}&ticketData=${encodeURIComponent(JSON.stringify(ticketData))}&shop=${tenant.id}`,
      cancel_url: `${protocol}://${host}?payment_cancel=true&shop=${tenant.id}`,
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error("Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message || "Erro ao iniciar a sessão de pagamento do Stripe." });
  }
});

// Stripe Create Payment Intent (Embedded Payment Element supporting Apple Pay & Google Pay)
app.post("/api/payment/create-payment-intent", async (req, res) => {
  try {
    const result = await getTenant(req);
    if (result.error) return res.status(400).json({ error: result.error });
    const tenant = result.tenant!;

    if (tenant.settings.isOnline === false) {
      return res.status(400).json({ error: "Desculpe! Esta barbearia está temporariamente offline para novos agendamentos no momento." });
    }

    const { name, adultsCount, kidsCount, serviceId, barberId, selectedAdultServices, selectedKidsServices, accepted_terms } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Nome é obrigatório." });
    }

    const secretKey = tenant.settings.stripeSecretKey;
    const publishableKey = tenant.settings.stripePublishableKey;
    if (!secretKey) {
      return res.status(400).json({ error: "O pagamento online não está configurado nesta barbearia (falta a Stripe Secret Key)." });
    }

    // Calculate total price of select services
    const defaultAdultSvc = tenant.services.find((s: any) => s.type === "adult") || tenant.services[0];
    const defaultKidsSvc = tenant.services.find((s: any) => s.type === "kids") || tenant.services[0];

    const actualAdultsCount = adultsCount !== undefined ? adultsCount : 1;
    const actualKidsCount = kidsCount !== undefined ? kidsCount : 0;

    let totalPrice = 0;
    const adultSvcList: Service[] = [];
    const kidsSvcList: Service[] = [];

    if (actualAdultsCount > 0) {
      for (let i = 0; i < actualAdultsCount; i++) {
        const sId = selectedAdultServices && selectedAdultServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultAdultSvc;
        if (svc) {
          adultSvcList.push(svc);
        } else if (defaultAdultSvc) {
          adultSvcList.push(defaultAdultSvc);
        }
      }
    }

    if (actualKidsCount > 0) {
      for (let i = 0; i < actualKidsCount; i++) {
        const sId = selectedKidsServices && selectedKidsServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultKidsSvc;
        if (svc) {
          kidsSvcList.push(svc);
        } else if (defaultKidsSvc) {
          kidsSvcList.push(defaultKidsSvc);
        }
      }
    }

    const allSelectedSvcs = [...adultSvcList, ...kidsSvcList];

    if (allSelectedSvcs.length > 0) {
      for (const s of allSelectedSvcs) {
        totalPrice += s.price;
      }
    } else {
      const service = tenant.services.find((s: any) => s.id === serviceId) || defaultAdultSvc;
      const personCount = Math.max(1, actualAdultsCount + actualKidsCount);
      totalPrice = (service ? service.price : 35.0) * personCount;
    }

    // Prepayment/Sinal is defined by servicePrice
    const configuredSinal = Number(tenant.settings.servicePrice) || 10.0;
    const finalPayAmount = Math.min(totalPrice, configuredSinal);

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16" as any
    });

    const ticketData = {
      name,
      adultsCount,
      kidsCount,
      serviceId,
      barberId,
      selectedAdultServices,
      selectedKidsServices,
      prepaidAmount: finalPayAmount,
      accepted_terms: !!accepted_terms
    };

    // Create a PaymentIntent with automatic payment methods (which automatically detects cards, Google Pay, Apple Pay, etc.)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalPayAmount * 100),
      currency: "gbp",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        ticketData: JSON.stringify(ticketData)
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: publishableKey,
      ticketData
    });
  } catch (error: any) {
    console.error("Stripe Create Payment Intent Error:", error);
    res.status(500).json({ error: error.message || "Erro ao iniciar o Payment Intent do Stripe." });
  }
});

// Stripe Success Intent handler
app.get("/api/payment/success-intent", async (req, res) => {
  const { payment_intent, ticketData } = req.query;

  if (!payment_intent || !ticketData) {
    return res.status(400).send("Parâmetros de pagamento inválidos.");
  }

  const result = await getTenant(req);
  if (result.error) return res.status(400).send(result.error);
  const tenant = result.tenant!;

  try {
    const parsedTicket = JSON.parse(decodeURIComponent(ticketData as string));
    
    // Check if we already created a ticket for this Stripe Payment Intent
    const existingTicket = tenant.tickets.find((t: any) => t.stripeSessionId === payment_intent);
    if (existingTicket) {
      return res.redirect(`/?payment_success=true&ticket_id=${existingTicket.id}&shop=${tenant.id}`);
    }

    // Verify payment status with Stripe
    const secretKey = tenant.settings.stripeSecretKey;
    if (!secretKey) {
      return res.status(400).send("Falta a Stripe Secret Key para validação.");
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16" as any
    });

    const pi = await stripe.paymentIntents.retrieve(payment_intent as string);
    if (pi.status !== "succeeded") {
      return res.status(400).send("O pagamento não foi confirmado pelo gateway.");
    }

    // Since payment is confirmed, create the ticket!
    const { name, adultsCount, kidsCount, serviceId, barberId, selectedAdultServices, selectedKidsServices, prepaidAmount } = parsedTicket;

    const barber = tenant.barbers.find((b: any) => b.id === barberId);
    if (!barber) {
      return res.status(400).send("Barbeiro selecionado não foi encontrado.");
    }

    const todayStr = new Date().toDateString();
    const todayTicketsCount = tenant.tickets.filter((t: any) => new Date(t.createdAt).toDateString() === todayStr).length;
    const nextNum = todayTicketsCount + 1;
    const numberStr = "#" + nextNum.toString().padStart(3, '0');

    let totalPrice = 0;
    let estimatedTime = 0;
    const serviceNamesList: string[] = [];

    const defaultAdultSvc = tenant.services.find((s: any) => s.type === "adult") || tenant.services[0];
    const defaultKidsSvc = tenant.services.find((s: any) => s.type === "kids") || tenant.services[0];

    const actualAdultsCount = adultsCount !== undefined ? adultsCount : 1;
    const actualKidsCount = kidsCount !== undefined ? kidsCount : 0;

    const adultSvcList: Service[] = [];
    const kidsSvcList: Service[] = [];

    if (actualAdultsCount > 0) {
      for (let i = 0; i < actualAdultsCount; i++) {
        const sId = selectedAdultServices && selectedAdultServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultAdultSvc;
        if (svc) {
          adultSvcList.push(svc);
        } else if (defaultAdultSvc) {
          adultSvcList.push(defaultAdultSvc);
        }
      }
    }

    if (actualKidsCount > 0) {
      for (let i = 0; i < actualKidsCount; i++) {
        const sId = selectedKidsServices && selectedKidsServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultKidsSvc;
        if (svc) {
          kidsSvcList.push(svc);
        } else if (defaultKidsSvc) {
          kidsSvcList.push(defaultKidsSvc);
        }
      }
    }

    const allSelectedSvcs = [...adultSvcList, ...kidsSvcList];

    if (allSelectedSvcs.length > 0) {
      for (const s of allSelectedSvcs) {
        totalPrice += s.price;
        estimatedTime += s.duration;
        serviceNamesList.push(s.name);
      }
    } else {
      const service = tenant.services.find((s: any) => s.id === serviceId) || defaultAdultSvc;
      const personCount = Math.max(1, actualAdultsCount + actualKidsCount);
      totalPrice = (service ? service.price : 35.0) * personCount;
      estimatedTime = (service ? service.duration : 30) * personCount;
      serviceNamesList.push(service ? service.name : "SERVIÇO");
    }

    const newTicket: QueueTicket = {
      id: "tkt-" + Math.random().toString(36).substring(2, 9),
      number: numberStr,
      name: name.toUpperCase(),
      adultsCount: actualAdultsCount,
      kidsCount: actualKidsCount,
      serviceId: serviceId || (allSelectedSvcs[0] ? allSelectedSvcs[0].id : "srv-1"),
      serviceName: serviceNamesList.join(" + ").toUpperCase(),
      barberId: barberId,
      barberName: barber.name,
      estimatedTime: estimatedTime,
      price: totalPrice,
      status: "AGUARDANDO",
      createdAt: new Date().toISOString(),
      stripeSessionId: payment_intent as string,
      prepaidAmount: Number(prepaidAmount) || 0,
      accepted_terms: !!parsedTicket.accepted_terms
    };

    tenant.tickets.push(newTicket);
    await saveTenant(tenant);

    res.redirect(`/?payment_success=true&ticket_id=${newTicket.id}&shop=${tenant.id}`);
  } catch (error: any) {
    console.error("Stripe Intent Success Callback Error:", error);
    res.status(500).send("Erro interno ao processar e confirmar o seu agendamento pós-pagamento.");
  }
});

// Stripe Success Callback handler
app.get("/api/payment/success", async (req, res) => {
  const { session_id, ticketData } = req.query;

  if (!session_id || !ticketData) {
    return res.status(400).send("Parâmetros de pagamento inválidos.");
  }

  const result = await getTenant(req);
  if (result.error) return res.status(400).send(result.error);
  const tenant = result.tenant!;

  try {
    const parsedTicket = JSON.parse(decodeURIComponent(ticketData as string));
    
    // Check if we already created a ticket for this Stripe Session to avoid duplication on page reload/refreshes
    const existingTicket = tenant.tickets.find((t: any) => t.stripeSessionId === session_id);
    if (existingTicket) {
      // Already created, redirect back to frontend with success
      return res.redirect(`/?payment_success=true&ticket_id=${existingTicket.id}&shop=${tenant.id}`);
    }

    // Verify payment status with Stripe
    const secretKey = tenant.settings.stripeSecretKey;
    if (!secretKey) {
      return res.status(400).send("Falta a Stripe Secret Key para validação.");
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16" as any
    });

    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    if (session.payment_status !== "paid") {
      return res.status(400).send("O pagamento não foi confirmado pelo gateway.");
    }

    // Since payment is confirmed, create the ticket!
    const { name, adultsCount, kidsCount, serviceId, barberId, selectedAdultServices, selectedKidsServices, prepaidAmount } = parsedTicket;

    const barber = tenant.barbers.find((b: any) => b.id === barberId);
    if (!barber) {
      return res.status(400).send("Barbeiro selecionado não foi encontrado.");
    }

    const todayStr = new Date().toDateString();
    const todayTicketsCount = tenant.tickets.filter((t: any) => new Date(t.createdAt).toDateString() === todayStr).length;
    const nextNum = todayTicketsCount + 1;
    const numberStr = "#" + nextNum.toString().padStart(3, '0');

    let totalPrice = 0;
    let estimatedTime = 0;
    const serviceNamesList: string[] = [];

    const defaultAdultSvc = tenant.services.find((s: any) => s.type === "adult") || tenant.services[0];
    const defaultKidsSvc = tenant.services.find((s: any) => s.type === "kids") || tenant.services[0];

    const actualAdultsCount = adultsCount !== undefined ? adultsCount : 1;
    const actualKidsCount = kidsCount !== undefined ? kidsCount : 0;

    const adultSvcList: Service[] = [];
    const kidsSvcList: Service[] = [];

    if (actualAdultsCount > 0) {
      for (let i = 0; i < actualAdultsCount; i++) {
        const sId = selectedAdultServices && selectedAdultServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultAdultSvc;
        if (svc) {
          adultSvcList.push(svc);
        } else if (defaultAdultSvc) {
          adultSvcList.push(defaultAdultSvc);
        }
      }
    }

    if (actualKidsCount > 0) {
      for (let i = 0; i < actualKidsCount; i++) {
        const sId = selectedKidsServices && selectedKidsServices[i];
        const svc = sId ? tenant.services.find((s: any) => s.id === sId) : defaultKidsSvc;
        if (svc) {
          kidsSvcList.push(svc);
        } else if (defaultKidsSvc) {
          kidsSvcList.push(defaultKidsSvc);
        }
      }
    }

    const allSelectedSvcs = [...adultSvcList, ...kidsSvcList];

    if (allSelectedSvcs.length > 0) {
      for (const s of allSelectedSvcs) {
        totalPrice += s.price;
        estimatedTime += s.duration;
        serviceNamesList.push(s.name);
      }
    } else {
      const service = tenant.services.find((s: any) => s.id === serviceId) || defaultAdultSvc;
      const personCount = Math.max(1, actualAdultsCount + actualKidsCount);
      totalPrice = (service ? service.price : 35.0) * personCount;
      estimatedTime = (service ? service.duration : 30) * personCount;
      serviceNamesList.push(service ? service.name : "SERVIÇO");
    }

    const newTicket: QueueTicket = {
      id: "tkt-" + Math.random().toString(36).substring(2, 9),
      number: numberStr,
      name: name.toUpperCase(),
      adultsCount: actualAdultsCount,
      kidsCount: actualKidsCount,
      serviceId: serviceId || (allSelectedSvcs[0] ? allSelectedSvcs[0].id : "srv-1"),
      serviceName: serviceNamesList.join(" + ").toUpperCase(),
      barberId: barberId,
      barberName: barber.name,
      estimatedTime: estimatedTime,
      price: totalPrice,
      status: "AGUARDANDO",
      createdAt: new Date().toISOString(),
      stripeSessionId: session_id as string,
      prepaidAmount: Number(prepaidAmount) || 0,
      accepted_terms: !!parsedTicket.accepted_terms
    };

    tenant.tickets.push(newTicket);
    await saveTenant(tenant);

    // Redirect to front-end app with successful query parameters
    res.redirect(`/?payment_success=true&ticket_id=${newTicket.id}&shop=${tenant.id}`);
  } catch (error: any) {
    console.error("Stripe Callback Error:", error);
    res.status(500).send("Erro interno ao processar e confirmar o seu agendamento pós-pagamento.");
  }
});

// Update Ticket Status
app.post("/api/tickets/:id/status", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  const { status } = req.body;

  const ticket = tenant.tickets.find((t: any) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  ticket.status = status;
  if (status === "EM_ATENDIMENTO") {
    ticket.calledAt = new Date().toISOString();
    // Auto-complete or close any other prior active or called ticket for THIS barber
    tenant.tickets = tenant.tickets.map((t: any) => {
      if (t.id !== id && t.barberId === ticket.barberId && (t.status === "EM_ATENDIMENTO" || t.status === "CHAMADO")) {
        return { ...t, status: "FINALIZADO", completedAt: new Date().toISOString() };
      }
      return t;
    });
  } else if (status === "FINALIZADO" || status === "NAO_COMPARECEU") {
    ticket.completedAt = new Date().toISOString();
  }

  await saveTenant(tenant);
  res.json({ success: true, ticket, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Call/Chamar Next Ticket for a barber
app.post("/api/tickets/next", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { barberId } = req.body;
  if (!barberId) {
    return res.status(400).json({ error: "Barber ID is required" });
  }

  // Find oldest ticket of Barber with status AGUARDANDO
  const nextTicket = tenant.tickets
    .filter((t: any) => t.barberId === barberId && t.status === "AGUARDANDO")
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

  if (!nextTicket) {
    return res.json({ success: false, message: "Não há clientes aguardando na fila deste barbeiro." });
  }

  // Complete other active or called tickets of this barber
  tenant.tickets = tenant.tickets.map((t: any) => {
    if (t.barberId === barberId && (t.status === "EM_ATENDIMENTO" || t.status === "CHAMADO")) {
      return { ...t, status: "FINALIZADO", completedAt: new Date().toISOString() };
    }
    return t;
  });

  const targetTkt = tenant.tickets.find((t: any) => t.id === nextTicket.id);
  if (targetTkt) {
    targetTkt.status = "CHAMADO";
    targetTkt.calledAt = new Date().toISOString();
  }

  await saveTenant(tenant);
  res.json({ success: true, ticket: targetTkt, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Cancel ticket
app.post("/api/tickets/:id/cancel", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  const ticket = tenant.tickets.find((t: any) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }
  ticket.status = "CANCELADO";
  await saveTenant(tenant);
  res.json({ success: true, ticket, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Ticket Check-in with location distance calculation
app.post("/api/tickets/:id/checkin", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Latitude e longitude são obrigatórias." });
  }

  const ticket = tenant.tickets.find((t: any) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket não encontrado." });
  }

  // Retrieve salon latitude and longitude from settings, defaulting to Lisbon
  const salonLat = tenant.settings.salonLatitude !== undefined ? Number(tenant.settings.salonLatitude) : 38.7223;
  const salonLng = tenant.settings.salonLongitude !== undefined ? Number(tenant.settings.salonLongitude) : -9.1393;

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
  }

  const distance = getDistance(Number(latitude), Number(longitude), salonLat, salonLng);

  ticket.checkedIn = true;
  ticket.latitude = Number(latitude);
  ticket.longitude = Number(longitude);
  ticket.distanceToSalon = Number(distance.toFixed(1));
  ticket.checkedInAt = new Date().toISOString();

  await saveTenant(tenant);
  res.json({ success: true, ticket, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Send Chat Message on Ticket
app.post("/api/tickets/:id/messages", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const { id } = req.params;
  const { sender, text } = req.body;

  const ticket = tenant.tickets.find((t: any) => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  if (!ticket.messages) {
    ticket.messages = [];
  }

  const newMessage = {
    id: "_" + Math.random().toString(36).substring(2, 11),
    sender,
    text,
    timestamp: new Date().toISOString()
  };

  ticket.messages.push(newMessage);
  await saveTenant(tenant);
  res.json({ success: true, ticket, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Reset Day (Reset Geral)
app.post("/api/tickets/reset", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  tenant.tickets = [];
  await saveTenant(tenant);
  res.json({ success: true, state: {
    settings: tenant.settings,
    barbers: tenant.barbers,
    services: tenant.services,
    tickets: tenant.tickets
  } });
});

// Get Month Codes List (for developer master licensing view with random key generation)
app.get("/api/licenses", async (req, res) => {
  const result = await getTenant(req);
  if (result.error) return res.status(400).json({ error: result.error });
  const tenant = result.tenant!;

  const list = [];
  const now = new Date();

  if (!tenant.monthlyLicenseKeys) {
    tenant.monthlyLicenseKeys = {};
  }
  
  // Return codes for last 2 months and next 10 months (total 12 months)
  for (let i = -2; i <= 9; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!tenant.monthlyLicenseKeys[key]) {
      tenant.monthlyLicenseKeys[key] = generateRandomSecureLicense();
    }
    const code = tenant.monthlyLicenseKeys[key];
    const currentMonthLabel = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    const isCurrent = i === 0;
    list.push({
      monthLabel: currentMonthLabel,
      code,
      isCurrent
    });
  }
  await saveTenant(tenant);
  res.json(list);
});

// Validate Client monthly license code
app.post("/api/license/validate", async (req, res) => {
  const { code, month, year } = req.body;
  if (!code) {
    return res.status(400).json({ error: "Código é obrigatório" });
  }

  const codeUpper = code.trim().toUpperCase();

  const result = await getTenant(req);
  if (result.error || !result.tenant) {
    return res.status(400).json({ error: result.error || "Tenant not found" });
  }
  const tenant = result.tenant!;

  const trialEnabled = tenant.settings.systemTestEnabled;
  const trialStart = tenant.settings.systemTestStartDate;
  const trialDuration = tenant.settings.systemTestDurationDays;
  const trialPw = tenant.settings.systemTestPassword || generateRandomSecureLicense();

  if (trialEnabled && trialStart && trialDuration && codeUpper === trialPw.trim().toUpperCase()) {
    const parts = trialStart.split('-');
    if (parts.length === 3) {
      const yearVal = parseInt(parts[0], 10);
      const monthVal = parseInt(parts[1], 10) - 1;
      const dayVal = parseInt(parts[2], 10);
      
      const startDate = new Date(yearVal, monthVal, dayVal, 0, 0, 0, 0);
      const nd = new Date();
      const today = new Date(nd.getFullYear(), nd.getMonth(), nd.getDate(), 0, 0, 0, 0);
      const diffTime = today.getTime() - startDate.getTime();
      const elapsedDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (elapsedDays >= 0 && elapsedDays <= trialDuration) {
        return res.json({ valid: true, isTrial: true });
      }
    }
  }

  if (!tenant.monthlyLicenseKeys) {
    tenant.monthlyLicenseKeys = {};
  }

  // If specific month and year are selected, we validate for that key: `${year}-${month}`
  if (month !== undefined && year !== undefined) {
    const key = `${year}-${month.toString().padStart(2, '0')}`;
    let targetCode = tenant.monthlyLicenseKeys[key];
    if (!targetCode) {
      targetCode = generateRandomSecureLicense();
      tenant.monthlyLicenseKeys[key] = targetCode;
      await saveTenant(tenant);
    }
    if (codeUpper === targetCode.toUpperCase()) {
      return res.json({ valid: true });
    }
    return res.json({ valid: false });
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  let currentCode = tenant.monthlyLicenseKeys[currentKey];
  if (!currentCode) {
    currentCode = generateRandomSecureLicense();
    tenant.monthlyLicenseKeys[currentKey] = currentCode;
    await saveTenant(tenant);
  }

  // Validate only for current month as per req: "Apenas a senha correspondente ao mês corrente"
  if (codeUpper === currentCode.toUpperCase()) {
    return res.json({ valid: true });
  }

  res.json({ valid: false });
});

// Helper for secure master developer password hashing
function getMasterPasswordHash(password: string): string {
  const salt = "barber_express_salt_2026_dev_master";
  return crypto.createHmac("sha256", salt).update(password).digest("hex");
}

// 🔑 MASTER DEVELOPER ENDPOINTS

// Master Login
app.post("/api/master/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ success: false, error: "Usuário/E-mail e senha são obrigatórios." });
  }

  const row = await get<any>("SELECT * FROM master_credentials WHERE id = 'singleton'");
  const credentials = row || {
    username: "admin",
    email: "",
    password_hash: "",
    is_first_access_done: 0
  };

  const loginStr = usernameOrEmail.trim().toLowerCase();
  const passStr = password.trim();

  // If first access has not been done yet:
  if (credentials.is_first_access_done !== 1) {
    if ((loginStr === "admin" || loginStr === "admin@admin.com") && passStr === "admin123") {
      return res.json({
        success: true,
        isFirstAccessDone: false,
        message: "Primeiro acesso bem-sucedido. Redirecionando para configuração obrigatória..."
      });
    } else {
      return res.status(401).json({
        success: false,
        error: "Credenciais de primeiro acesso inválidas. Use usuário 'admin' e senha 'admin123'."
      });
    }
  }

  // If first access is completed, check against the hashed credentials:
  const isUserMatch = loginStr === credentials.username.toLowerCase() || (credentials.email && loginStr === credentials.email.toLowerCase());
  const hashedInput = getMasterPasswordHash(passStr);
  const isPassMatch = hashedInput === credentials.password_hash;

  if (isUserMatch && isPassMatch) {
    return res.json({
      success: true,
      isFirstAccessDone: true,
      message: "Sucesso no login!"
    });
  } else {
    return res.status(401).json({
      success: false,
      error: "Usuário, e-mail ou senha incorretos."
    });
  }
});

// Master First Access Config (Setup)
app.post("/api/master/setup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "E-mail e nova senha são obrigatórios." });
  }

  const emailLower = email.trim().toLowerCase();
  const passwordHash = getMasterPasswordHash(password.trim());

  await run(
    `INSERT OR REPLACE INTO master_credentials (id, username, email, password_hash, is_first_access_done, reset_token, reset_token_expires)
     VALUES ('singleton', 'admin', ?, ?, 1, NULL, NULL)`,
    [emailLower, passwordHash]
  );

  res.json({
    success: true,
    isFirstAccessDone: true,
    message: "Dados de primeiro acesso atualizados com sucesso!"
  });
});

// Update Master credentials (change email and password)
app.post("/api/master/change-credentials", async (req, res) => {
  const { newEmail, newPassword } = req.body;
  if (!newEmail && !newPassword) {
    return res.status(400).json({ success: false, error: "E-mail ou nova senha são obrigatórios para atualizar." });
  }

  const row = await get<any>("SELECT * FROM master_credentials WHERE id = 'singleton'");
  if (!row) {
    return res.status(404).json({ success: false, error: "Credenciais do Master não encontradas." });
  }

  let finalEmail = row.email;
  let finalPasswordHash = row.password_hash;

  if (newEmail) {
    finalEmail = newEmail.trim().toLowerCase();
  }
  if (newPassword) {
    finalPasswordHash = getMasterPasswordHash(newPassword.trim());
  }

  await run(
    `UPDATE master_credentials SET email = ?, password_hash = ?, is_first_access_done = 1 WHERE id = 'singleton'`,
    [finalEmail, finalPasswordHash]
  );

  res.json({
    success: true,
    message: "Credenciais de acesso master atualizadas com sucesso!"
  });
});

// Master Forgot Password (simulating email dispatch)
app.post("/api/master/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "E-mail é obrigatório." });
  }

  const credentials = await get<any>("SELECT * FROM master_credentials WHERE id = 'singleton'");
  if (!credentials || credentials.is_first_access_done !== 1) {
    return res.status(400).json({
      success: false,
      error: "O primeiro acesso ainda não foi realizado. Acesse com o usuário 'admin' e senha 'admin123' para realizar a configuração inicial."
    });
  }

  const emailLower = email.trim().toLowerCase();
  if ((credentials.email || "").toLowerCase() !== emailLower) {
    return res.status(404).json({
      success: false,
      error: "Nenhum administrador encontrado com o e-mail informado."
    });
  }

  // Generate a reset token
  const resetToken = crypto.randomBytes(20).toString('hex');
  const resetTokenExpires = Date.now() + 3600000; // 1 h expiration

  await run(
    `UPDATE master_credentials SET reset_token = ?, reset_token_expires = ? WHERE id = 'singleton'`,
    [resetToken, resetTokenExpires]
  );

  const resetUrl = `/?view=master&token=${resetToken}`;

  // Log to console (ready for email integration, e.g. Nodemailer or Sendgrid)
  console.log("=========================================");
  console.log("SIMULAÇÃO DE ENVIO DE E-MAIL DE RECUPERAÇÃO");
  console.log(`Para: ${email}`);
  console.log("Assunto: Recuperação de Senha - Barbearia");
  console.log(`Link de redefinição: ${resetUrl}`);
  console.log("=========================================");

  res.json({
    success: true,
    message: "Instruções de redefinição de senha enviadas com sucesso! (Simulado em Tela)",
    simulatedLink: resetUrl
  });
});

// Master Reset Password (completing token flow)
app.post("/api/master/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, error: "Token e nova senha são obrigatórios." });
  }

  const credentials = await get<any>("SELECT * FROM master_credentials WHERE id = 'singleton'");
  if (!credentials || credentials.reset_token !== token || !credentials.reset_token_expires || credentials.reset_token_expires < Date.now()) {
    return res.status(400).json({
      success: false,
      error: "Token de redefinição inválido ou expirado."
    });
  }

  const passwordHash = getMasterPasswordHash(password.trim());
  
  await run(
    `UPDATE master_credentials SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = 'singleton'`,
    [passwordHash]
  );

  res.json({
    success: true,
    message: "Sua senha foi redefinida com sucesso! Agora você já pode entrar com a nova senha."
  });
});

// 🏢 SUPER ADMIN / SAAS TENANTS MANAGEMENT ENDPOINTS

// List all barber shops with brief details
app.get("/api/super/shops", async (req, res) => {
  try {
    const summary = [];
    const shops = await all<any>("SELECT * FROM barber_shops ORDER BY name ASC");
    for (const s of shops) {
      const barbers = await all<any>("SELECT COUNT(*) as count FROM barbers WHERE barbearia_id = ?", [s.id]);
      const services = await all<any>("SELECT COUNT(*) as count FROM services WHERE barbearia_id = ?", [s.id]);
      const tickets = await all<any>("SELECT COUNT(*) as count FROM tickets WHERE barbearia_id = ?", [s.id]);
      const settingsRow = await get<any>("SELECT system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password FROM settings WHERE barbearia_id = ?", [s.id]);

      let monthlyKeys = {};
      try {
        monthlyKeys = JSON.parse(s.monthly_license_keys || "{}");
      } catch (e) {}

      summary.push({
        id: s.id,
        name: s.name,
        active: s.active === 1,
        customDomain: s.custom_domain,
        monthlyLicenseKeys: monthlyKeys,
        createdAt: s.created_at,
        barbersCount: barbers[0]?.count || 0,
        ticketsCount: tickets[0]?.count || 0,
        servicesCount: services[0]?.count || 0,
        systemTestEnabled: settingsRow ? settingsRow.system_test_enabled === 1 : false,
        systemTestStartDate: settingsRow ? settingsRow.system_test_start_date || "" : "",
        systemTestDurationDays: settingsRow ? settingsRow.system_test_duration_days || 7 : 7,
        systemTestPassword: settingsRow ? settingsRow.system_test_password || generateRandomSecureLicense() : generateRandomSecureLicense()
      });
    }
    res.json({ success: true, shops: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new barber shop
app.post("/api/super/shops", async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ success: false, error: "Identificador (slug) e Nome da Barbearia são obrigatórios." });
    }

    const slug = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!slug) {
      return res.status(400).json({ success: false, error: "O slug informado é inválido. Utilize letras minúsculas, números ou hífens." });
    }

    const exists = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [slug]);
    if (exists) {
      return res.status(400).json({ success: false, error: "Já existe uma barbearia cadastrada com este identificador (slug)." });
    }

    const systemTestPass = generateRandomSecureLicense();
    const newShopObj = {
      id: slug,
      name: name.trim(),
      active: true,
      customDomain: null,
      createdAt: new Date().toISOString(),
      monthlyLicenseKeys: {} as any,
      settings: {
        name: name.trim(),
        address: "RUA EXEMPLO, 123",
        instagram: "",
        facebook: "",
        logoUrl: "",
        thankYouMessage: "OBRIGADO!",
        announcementDuration: 5,
        systemTestEnabled: false,
        systemTestStartDate: "",
        systemTestDurationDays: 7,
        systemTestPassword: systemTestPass,
        colorPalette: "emerald",
        backgroundTheme: "default",
        sendInstagram: true,
        sendFacebook: true,
        stripePublishableKey: "",
        stripeSecretKey: "",
        servicePrice: 35.0,
        salonLatitude: 38.7223,
        salonLongitude: -9.1393
      },
      barbers: [
        { id: `barber-1-${slug}`, name: "BARBEIRO 1", active: true },
        { id: `barber-2-${slug}`, name: "NOVO BARBEIRO", active: true }
      ],
      services: [
        { id: `srv-1-${slug}`, name: "CORTE", price: 35.0, duration: 30, type: "adult" },
        { id: `srv-2-${slug}`, name: "CORTE KIDS", price: 25.0, duration: 25, type: "kids" }
      ],
      tickets: []
    };

    const currentYear = new Date().getFullYear();
    // Generate monthly license keys for the current year
    for (let m = 1; m <= 12; m++) {
      newShopObj.monthlyLicenseKeys[`${currentYear}-${m.toString().padStart(2, '0')}`] = generateRandomSecureLicense();
    }
    // Generate monthly license keys for the next year to ensure continuity
    for (let m = 1; m <= 12; m++) {
      newShopObj.monthlyLicenseKeys[`${currentYear + 1}-${m.toString().padStart(2, '0')}`] = generateRandomSecureLicense();
    }

    await run(
      `INSERT INTO barber_shops (id, name, active, custom_domain, monthly_license_keys, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [slug, newShopObj.name, 1, null, JSON.stringify(newShopObj.monthlyLicenseKeys), newShopObj.createdAt]
    );

    await saveTenant(newShopObj);

    res.json({ success: true, shop: { id: newShopObj.id, name: newShopObj.name, active: true } });
  } catch (error: any) {
    console.error("🚨 POST /api/super/shops failed:", error);
    res.status(500).json({ success: false, error: error.message || "Erro interno do servidor ao criar barbearia." });
  }
});

// Toggle (block/unblock) barber shop
app.post("/api/super/shops/:id/toggle", async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (id === "matriz") {
      return res.status(400).json({ success: false, error: "Não é permitido bloquear a barbearia original padrão." });
    }

    const shop = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [id]);
    if (!shop) {
      return res.status(404).json({ success: false, error: "Barbearia não encontrada." });
    }

    const newActive = active ? 1 : 0;
    await run(`UPDATE barber_shops SET active = ? WHERE id = ?`, [newActive, id]);

    res.json({ success: true, id, active: !!active });
  } catch (error: any) {
    console.error("🚨 POST /api/super/shops/:id/toggle failed:", error);
    res.status(500).json({ success: false, error: error.message || "Erro interno do servidor ao gerenciar status da barbearia." });
  }
});

// Delete a barber shop and all its records
app.post("/api/super/shops/:id/delete", async (req, res) => {
  const { id } = req.params;

  if (id === "matriz" || id === "default") {
    return res.status(400).json({ success: false, error: "Não é permitido excluir a barbearia original padrão." });
  }

  const shop = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [id]);
  if (!shop) {
    return res.status(404).json({ success: false, error: "Barbearia não encontrada." });
  }

  try {
    // Delete cascading references
    await run(`DELETE FROM settings WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM barbers WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM services WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM tickets WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM barber_shops WHERE id = ?`, [id]);

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Erro ao deletar loja:", err);
    res.status(500).json({ success: false, error: "Erro interno ao deletar a barbearia." });
  }
});

app.delete("/api/super/shops/:id", async (req, res) => {
  const { id } = req.params;

  if (id === "matriz" || id === "default") {
    return res.status(400).json({ success: false, error: "Não é permitido excluir a barbearia original padrão." });
  }

  const shop = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [id]);
  if (!shop) {
    return res.status(404).json({ success: false, error: "Barbearia não encontrada." });
  }

  try {
    await run(`DELETE FROM settings WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM barbers WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM services WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM tickets WHERE barbearia_id = ?`, [id]);
    await run(`DELETE FROM barber_shops WHERE id = ?`, [id]);

    res.json({ success: true, id });
  } catch (err: any) {
    console.error("Erro ao deletar loja:", err);
    res.status(500).json({ success: false, error: "Erro interno ao deletar a barbearia." });
  }
});

// Update barber shop details (name, custom domain, and trial settings)
app.post("/api/super/shops/:id/update", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, customDomain, systemTestEnabled, systemTestStartDate, systemTestDurationDays, systemTestPassword } = req.body;

    console.log("Updating shop:", { id, name, customDomain, systemTestEnabled, systemTestStartDate, systemTestDurationDays, systemTestPassword });

    const shop = await get<any>("SELECT * FROM barber_shops WHERE id = ?", [id]);
    if (!shop) {
      return res.status(404).json({ success: false, error: "Barbearia não encontrada." });
    }

    const newName = (name || "").trim() || shop.name;
    const newDomain = customDomain ? customDomain.trim().toLowerCase() : null;

    await run(
      `UPDATE barber_shops SET name = ?, custom_domain = ? WHERE id = ?`,
      [newName, newDomain, id]
    );

    // Update trial settings on settings table if provided
    if (systemTestEnabled !== undefined || systemTestStartDate !== undefined || systemTestDurationDays !== undefined || systemTestPassword !== undefined) {
      const hasSettings = await get<any>("SELECT 1 FROM settings WHERE barbearia_id = ?", [id]);
      const sEnabled = systemTestEnabled ? 1 : 0;
      const sStart = systemTestStartDate || "";
      
      let sDuration = 7;
      if (systemTestDurationDays !== undefined) {
        sDuration = parseInt(String(systemTestDurationDays), 10);
        if (isNaN(sDuration)) {
          sDuration = 7;
        }
      }
      
      const sPass = (systemTestPassword || generateRandomSecureLicense()).toUpperCase();

      console.log("Applying settings updates for brand:", { id, sEnabled, sStart, sDuration, sPass });

      if (!hasSettings) {
        await run(
          `INSERT INTO settings (
             barbearia_id, name, address, instagram, facebook, logo_url, thank_you_message, announcement_duration,
             system_test_enabled, system_test_start_date, system_test_duration_days, system_test_password,
             color_palette, background_theme, send_instagram, send_facebook, stripe_publishable_key,
             stripe_secret_key, service_price, salon_latitude, salon_longitude
           ) VALUES (?, ?, 'RUA EXEMPLO, 123', '', '', '', '', 5, ?, ?, ?, ?, 'emerald', 'default', 1, 1, '', '', 35.0, 38.7223, -9.1393)`,
          [id, newName, sEnabled, sStart, sDuration, sPass]
        );
      } else {
        await run(
          `UPDATE settings SET 
             system_test_enabled = ?, 
             system_test_start_date = ?, 
             system_test_duration_days = ?, 
             system_test_password = ?
           WHERE barbearia_id = ?`,
          [sEnabled, sStart, sDuration, sPass, id]
        );
      }
    }

    res.json({ success: true, id, name: newName, customDomain: newDomain });
  } catch (error: any) {
    console.error("Error updating shop details:", error);
    res.status(500).json({ success: false, error: error.message || "Erro interno ao atualizar os dados." });
  }
});

// PWA Static Endpoints
app.get("/app-logo.jpg", (req, res) => {
  const logoPath = path.join(process.cwd(), "src", "assets", "images", "app_logo_1781821346398.jpg");
  if (fs.existsSync(logoPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    return res.sendFile(logoPath);
  }
  res.status(404).end();
});

// Explicit routes for flags to guarantee loading across dev and production containers
app.get("/src/assets/images/brazil_flag_wavy_1781820362136.jpg", (req, res) => {
  const flagPath = path.join(process.cwd(), "src", "assets", "images", "brazil_flag_wavy_1781820362136.jpg");
  if (fs.existsSync(flagPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    return res.sendFile(flagPath);
  }
  res.status(404).end();
});

app.get("/src/assets/images/gb_flag_wavy_1781820377470.jpg", (req, res) => {
  const flagPath = path.join(process.cwd(), "src", "assets", "images", "gb_flag_wavy_1781820377470.jpg");
  if (fs.existsSync(flagPath)) {
    res.setHeader("Content-Type", "image/jpeg");
    return res.sendFile(flagPath);
  }
  res.status(404).end();
});

app.get("/manifest.json", (req, res) => {
  res.json({
    name: "Barbearia Express - Senhas",
    short_name: "Barbearia",
    start_url: "/",
    display: "standalone",
    background_color: "#07090E",
    theme_color: "#00E396",
    orientation: "portrait",
    description: "Pegue sua senha de atendimento e acompanhe a fila em tempo real.",
    icons: [
      {
        src: "/app-logo.jpg",
        sizes: "192x192",
        type: "image/jpeg"
      },
      {
        src: "/app-logo.jpg",
        sizes: "512x512",
        type: "image/jpeg"
      }
    ]
  });
});

app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    const CACHE_NAME = 'barber-pwa-cache-v2';
    const ASSETS = [
      '/app-logo.jpg',
      '/manifest.json'
    ];

    self.addEventListener('install', (e) => {
      self.skipWaiting();
      e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
          return cache.addAll(ASSETS).catch(() => {});
        })
      );
    });

    self.addEventListener('activate', (e) => {
      e.waitUntil(
        caches.keys().then((keys) => {
          return Promise.all(
            keys.map((key) => {
              if (key !== CACHE_NAME) {
                return caches.delete(key);
              }
            })
          );
        }).then(() => self.clients.claim())
      );
    });

    self.addEventListener('fetch', (e) => {
      if (
        e.request.method !== 'GET' ||
        e.request.url.includes('/api/') || 
        e.request.url.includes('ws') || 
        e.request.url.includes('chrome-extension')
      ) {
        return;
      }
      e.respondWith(
        fetch(e.request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const url = new URL(e.request.url);
              if (url.pathname !== '/' && !url.pathname.endsWith('.html')) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(e.request, responseToCache);
                });
              }
            }
            return response;
          })
          .catch(() => {
            return caches.match(e.request);
          })
      );
    });
  `);
});

// Start server
async function bootServer() {
  // Determine production dynamically. If running the compiled bundle server.cjs, we are in production
  // regardless of whether process.env.NODE_ENV is set or not (e.g., inside self-deployed containers).
  const isProductionMode = 
    (typeof __filename !== "undefined" && __filename && (__filename.endsWith("server.cjs") || __filename.endsWith("server.js"))) ||
    (typeof __dirname !== "undefined" && __dirname && __dirname.includes("dist")) ||
    process.env.NODE_ENV === "production";

  if (!isProductionMode) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Determine the absolute path to 'dist' folder securely from process.cwd() or fallback directories.
    let distPath = __dirname;
    if (!distPath.endsWith("dist") && !distPath.endsWith("dist/")) {
      const cwdDist = path.join(process.cwd(), "dist");
      if (fs.existsSync(cwdDist)) {
        distPath = cwdDist;
      } else {
        const relativeDist = path.join(__dirname, "dist");
        if (fs.existsSync(relativeDist)) {
          distPath = relativeDist;
        }
      }
    }
    
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

export { app };

bootServer();
