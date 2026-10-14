const express = require('express');
const path = require('path');
const fs = require('fs');
const { askAgent, getApiKey } = require('./agent');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Get current API key status
app.get('/api/config', (req, res) => {
    const key = getApiKey();
    const isConfigured = key && key !== 'your_api_key_here' && key.trim().length > 10;
    const masked = isConfigured ? `${key.trim().slice(0, 8)}...${key.trim().slice(-4)}` : '';
    res.json({
        configured: isConfigured,
        provider: 'gemini',
        maskedKey: masked
    });
});

// Save new API key from the Web UI directly
app.post('/api/config', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
        return res.status(400).json({ error: "API key cannot be empty." });
    }
    const cleanKey = apiKey.trim();
    process.env.GEMINI_API_KEY = cleanKey;
    
    try {
        const envPath = path.join(__dirname, '.env');
        fs.writeFileSync(envPath, `GEMINI_API_KEY=${cleanKey}\n`, 'utf-8');
        res.json({
            success: true,
            provider: 'gemini',
            message: 'Google Gemini API key saved successfully!'
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to write to .env file: " + err.message });
    }
});

app.post('/api/ask', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "No message provided." });
    
    try {
        const reply = await askAgent(userMessage);
        res.json({ reply });
    } catch (error) {
        console.error("Server API ask error:", error);
        res.status(500).json({ error: "Agent encountered a server error: " + error.message });
    }
});

const PORT = process.env.PORT || 8080;

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(`🌐 Osaid Core (Powered by Google Gemini) is LIVE!`);
        console.log(`Open http://localhost:${PORT} in your browser.`);
        console.log(`=========================================`);
    });
}

module.exports = app;
