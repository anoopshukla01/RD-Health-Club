import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';
import { initialContent } from './src/data/initial-content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing with generous payload limit for base64 images
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure data storage directory exists
// On Render with persistent disk, the disk is mounted at /opt/render/project/src/data
const RENDER_DISK = '/opt/render/project/src/data';
const DATA_DIR = process.env.NODE_ENV === 'production' && fs.existsSync('/opt/render/project/src')
  ? RENDER_DISK
  : resolve(__dirname, 'data');
const DATA_FILE = join(DATA_DIR, 'cms-content.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialContent, null, 2), 'utf-8');
      console.log('[CMS Server] Initialized cms-content.json with default dataset');
    }
  } catch (err) {
    console.error('[CMS Server] Error initializing data file:', err);
  }
}

function readCMSData() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    // Merge with initial content to guarantee all sections exist
    return {
      ...initialContent,
      ...parsed,
      brand: { ...initialContent.brand, ...(parsed.brand || {}) },
      hero: { ...initialContent.hero, ...(parsed.hero || {}) },
      about: { ...initialContent.about, ...(parsed.about || {}) },
      membership: {
        ...initialContent.membership,
        ...(parsed.membership || {}),
        plans: (parsed.membership && parsed.membership.plans) ? parsed.membership.plans : initialContent.membership.plans,
        personalTraining: { ...initialContent.membership.personalTraining, ...((parsed.membership && parsed.membership.personalTraining) || {}) }
      },
      trainers: parsed.trainers || initialContent.trainers,
      facilities: parsed.facilities || initialContent.facilities,
      gallery: parsed.gallery || initialContent.gallery,
      reviews: parsed.reviews || initialContent.reviews,
      contact: { ...initialContent.contact, ...(parsed.contact || {}) },
      inquiries: parsed.inquiries || initialContent.inquiries,
      adminSettings: { ...initialContent.adminSettings, ...(parsed.adminSettings || {}) }
    };
  } catch (err) {
    console.error('[CMS Server] Failed to read data file:', err);
    return initialContent;
  }
}

function writeCMSData(data) {
  ensureDataFile();
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[CMS Server] Failed to write data file:', err);
    return false;
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fetch current CMS content
app.get('/api/content', (req, res) => {
  const data = readCMSData();
  res.json(data);
});

// Save updated CMS content
app.post('/api/content', (req, res) => {
  const updatedData = req.body;
  if (!updatedData || typeof updatedData !== 'object') {
    return res.status(400).json({ error: 'Invalid content payload' });
  }

  const success = writeCMSData(updatedData);
  if (success) {
    res.json({ success: true, message: 'Content saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to write content to storage' });
  }
});

// Log a new lead/inquiry from website forms
app.post('/api/inquiries', (req, res) => {
  const inq = req.body;
  if (!inq) {
    return res.status(400).json({ error: 'Missing inquiry details' });
  }

  const current = readCMSData();
  if (!Array.isArray(current.inquiries)) current.inquiries = [];

  const record = {
    id: 'inq-' + Date.now(),
    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    name: inq.name || 'Anonymous Visitor',
    phone: inq.phone || 'Not provided',
    plan: inq.plan || 'General Inquire',
    message: inq.message || '',
    status: 'New'
  };

  current.inquiries.unshift(record);
  writeCMSData(current);
  res.json({ success: true, inquiry: record });
});

// Reset CMS content to initial defaults
app.post('/api/reset', (req, res) => {
  const success = writeCMSData(initialContent);
  if (success) {
    res.json({ success: true, message: 'Content reset to defaults', data: initialContent });
  } else {
    res.status(500).json({ error: 'Failed to reset content' });
  }
});

// =============================================================================
// STATIC ASSET SERVING (PRODUCTION)
// =============================================================================
const distDir = resolve(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  app.get('/admin', (req, res) => {
    res.sendFile(join(distDir, 'admin.html'));
  });

  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(join(distDir, 'index.html'));
    }
    next();
  });
} else {
  // Fallback if dist doesn't exist yet
  app.get('/', (req, res) => {
    res.send('RD Health Club Backend running. Run `npm run build` to generate frontend assets.');
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[RD Health Club Server] Live on http://0.0.0.0:${PORT}`);
});
