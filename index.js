const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const FIREBASE_DB_URL = process.env.FIREBASE_DB_URL;
const FIREBASE_DB_SECRET = process.env.FIREBASE_DB_SECRET;
const AUTH_TOKEN = process.env.YOUR_AUTH_TOKEN;

// Helper: Check Auth Header
function isAuthorized(req) {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader === `Bearer ${AUTH_TOKEN}`;
}

// 🔹 CheckBan endpoint (your existing one, keep it)
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
    console.error('Ban check failed:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🔹 GET /FirebaseProxy/getUserData/:userId → used by IsUserBanned
app.get('/FirebaseProxy/getUserData/:userId', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const userBanUrl = `${FIREBASE_DB_URL}banned_users/${userId}.json?auth=${FIREBASE_DB_SECRET}`;

    const userBanResp = await axios.get(userBanUrl);

    return res.json(userBanResp.data || {});
  } catch (err) {
    console.error('Get user data failed:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🔹 POST /FirebaseProxy/saveUserData → used by starts34
app.post('/FirebaseProxy/saveUserData', async (req, res) => {
  try {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userID, hwid, reason, ban_status, timestamp } = req.body;

    // Validate required fields
    if (!userID || !hwid || !reason || ban_status !== true || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields or invalid data' });
    }

    const data = {
      userID,
      hwid,
      reason,
      ban_status,
      timestamp
    };

    const userIdUrl = `${FIREBASE_DB_URL}banned_users/${userID}.json?auth=${FIREBASE_DB_SECRET}`;
    const hwidUrl = `${FIREBASE_DB_URL}banned_users_by_hwid/${hwid}.json?auth=${FIREBASE_DB_SECRET}`;

    // Save to both userID and HWID paths
    await Promise.all([
      axios.put(userIdUrl, data),
      axios.put(hwidUrl, data),
    ]);

    console.log(`[Ban Saved] UserID: ${userID}, HWID: ${hwid}, Reason: ${reason}`);

    return res.json({ success: true });
  } catch (err) {
    console.error('Save user data failed:', err?.response?.data || err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Ban check backend running on port ${port}`);
});
