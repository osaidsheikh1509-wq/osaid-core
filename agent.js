const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const { executeTool } = require('./tools');
require('dotenv').config();

const MEMORY_FILE = process.env.VERCEL 
    ? path.join('/tmp', 'memory.json') 
    : path.join(__dirname, 'memory.json');
const PERSONALITY_FILE = path.join(__dirname, 'personality.txt');

function getApiKey() {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

// --- MEMORY MANAGEMENT ---
function loadMemory() {
    if (fs.existsSync(MEMORY_FILE)) {
        try { return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8')); } 
        catch (e) { return []; }
    }
    return [];
}

function saveMemory(memory) {
    try {
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    } catch (e) {
        console.warn("Notice: Skipped writing memory to disk (serverless mode):", e.message);
    }
}

function loadPersonality() {
    let base = "Your name is Osaid Core. You are Osaid's helpful, highly intelligent personal AI agent.";
    if (fs.existsSync(PERSONALITY_FILE)) {
        base = fs.readFileSync(PERSONALITY_FILE, 'utf-8');
    }
    const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    return `${base}\n\nIMPORTANT CONTEXT:\n- Today's real-world date is: ${today}.\n- If asked for today's date or time, answer using this date accurately.`;
}

// Tool definitions for Gemini
const geminiToolsDefinition = [
    {
        functionDeclarations: [
            {
                name: "web_search",
                description: "Search the web for current information, news, prices, or recent events.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { 
                            type: "STRING", 
                            description: "The search query to look up on the web." 
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "run_javascript",
                description: "Run secure JavaScript code to solve complex math problems, logic puzzles, or execute calculations.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        code: { 
                            type: "STRING", 
                            description: "The JS code to execute. You MUST use console.log() to output the answer." 
                        }
                    },
                    required: ["code"]
                }
            }
        ]
    }
];

// --- MAIN AGENT LOOP USING GEMINI ---
async function askAgent(userInput) {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_api_key_here') {
        return "⚠️ Google Gemini API Key is missing!\n\nPlease enter your Google Gemini API Key in the settings bar at the top of the page.";
    }

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const systemInstruction = loadPersonality();

    const memory = loadMemory();

    try {
        const chat = ai.chats.create({
            model: 'gemini-flash-lite-latest',
            config: {
                systemInstruction: systemInstruction,
                tools: geminiToolsDefinition
            }
        });

        let response = await chat.sendMessage({ message: userInput });
        let iteration = 0;
        const MAX_ITERATIONS = 5;

        while (iteration < MAX_ITERATIONS) {
            const functionCalls = response.functionCalls;
            if (!functionCalls || functionCalls.length === 0) break;

            iteration++;
            const call = functionCalls[0];
            console.log(`🤖 [Gemini calling tool]: ${call.name} with:`, call.args);
            const toolResult = await executeTool(call.name, call.args);

            // Send tool result back to Gemini
            response = await chat.sendMessage({
                message: [{
                    functionResponse: {
                        name: call.name,
                        response: { output: String(toolResult) }
                    }
                }]
            });
        }

        const reply = response.text || "I processed your request.";

        // Update memory
        memory.push({ role: 'user', content: userInput });
        memory.push({ role: 'assistant', content: reply });
        saveMemory(memory);

        return reply;
    } catch (error) {
        console.error("\n❌ FULL Gemini API Error:", error);
        
        if (error.status === 400 || (error.message && error.message.includes('API_KEY_INVALID'))) {
            return "⚠️ Invalid API Key: Google Gemini rejected the provided key. Please verify your key at https://aistudio.google.com/app/apikey.";
        }
        if (error.status === 429) {
            return "⚠️ Rate limit reached: Google Gemini is temporarily rate-limiting requests. Please wait a moment and try again.";
        }
        if (error.status === 503) {
            return "⚠️ Gemini service is busy: Google's servers are experiencing temporary high demand. Please try again in a few seconds.";
        }
        return `⚠️ Error from Google Gemini: ${error.message || 'Unknown error'}`;
    }
}

module.exports = { askAgent, getApiKey };
