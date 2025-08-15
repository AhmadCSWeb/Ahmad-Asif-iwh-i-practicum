require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const CUSTOM_OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE;

const P1 = process.env.PROP1;
const P2 = process.env.PROP2;
const P3 = process.env.PROP3;
const L1 = process.env.PROP1_LABEL || P1;
const L2 = process.env.PROP2_LABEL || P2;
const L3 = process.env.PROP3_LABEL || P3;

if (!ACCESS_TOKEN || !CUSTOM_OBJECT_TYPE || !P1 || !P2 || !P3) {
  console.error('❌ Missing required env vars. Check .env for HUBSPOT_ACCESS_TOKEN, CUSTOM_OBJECT_TYPE, PROP1/2/3.');
  process.exit(1);
}

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
});

// 1) GET "/" — homepage: list custom object records
app.get('/', async (req, res) => {
  try {
    const properties = [P1, P2, P3].join(',');
    const { data } = await hubspot.get(`/crm/v3/objects/${encodeURIComponent(CUSTOM_OBJECT_TYPE)}`, {
      params: { properties, archived: false }
    });

    const rows = (data.results || []).map(r => ({
      id: r.id,
      p1: r.properties?.[P1] || '',
      p2: r.properties?.[P2] || '',
      p3: r.properties?.[P3] || ''
    }));

    res.render('homepage', {
      title: 'Custom Objects Table | IWH-I Practicum',
      rows,
      labels: [L1, L2, L3],
      error: null
    });
  } catch (err) {
    console.error('Error fetching records:', err.response?.data || err.message);
    res.status(500).render('homepage', {
      title: 'Custom Objects Table | IWH-I Practicum',
      rows: [],
      labels: [L1, L2, L3],
      error: 'Failed to fetch records. Check your .env and HubSpot permissions.'
    });
  }
});

// 2) GET "/update-cobj" — render form
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
    labels: [L1, L2, L3],
    error: null
  });
});

// 3) POST "/update-cobj" — create record and redirect home
app.post('/update-cobj', async (req, res) => {
  try {
    const payload = {
      properties: {
        [P1]: req.body.prop1 || '',
        [P2]: req.body.prop2 || '',
        [P3]: req.body.prop3 || ''
      }
    };
    await hubspot.post(`/crm/v3/objects/${encodeURIComponent(CUSTOM_OBJECT_TYPE)}`, payload);
    res.redirect('/');
  } catch (err) {
    console.error('Error creating record:', err.response?.data || err.message);
    res.status(500).render('updates', {
      title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
      labels: [L1, L2, L3],
      error: 'Failed to create record. Verify property internal names and token scopes.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});