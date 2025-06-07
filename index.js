const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
const AUTH_TOKEN = process.env.YOUR_AUTH_TOKEN;

app.post('/checkBan', async (req, res) => {
  try {
    const { userId, hwid, token } = req.body;

    if (!token || token !== AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!userId || !hwid) {
      return res.status(400).json({ error: 'Missing userId or hwid' });
    }

    const userBanUrl = `${FIREBASE_DB_URL}banned_users/${userId}.json?auth=${FIREBASE_DB_SECRET}`;
    const hwidBanUrl = `${FIREBASE_DB_URL}banned_users_by_hwid/${hwid}.json?auth=${FIREBASE_DB_SECRET}`;

    const [userBanResp, hwidBanResp] = await Promise.all([
      axios.get(userBanUrl),
      axios.get(hwidBanUrl),
    ]);

    const userBanned = userBanResp.data !== null;
    const hwidBanned = hwidBanResp.data !== null;

    return res.json({
      banned: userBanned || hwidBanned,
      userBanData: userBanResp.data || null,
      hwidBanData: hwidBanResp.data || null,
    });
  } catch (err) {
    console.error('Ban check failed:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ban check backend running on port ${port}`);
});
