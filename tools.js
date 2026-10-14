const vm = require('vm');
const { search } = require('duck-duck-scrape');
const { SchemaType } = require('@google/generative-ai');

// 1. Claude Tool Schemas
const tools = [
    {
        name: "web_search",
        description: "Search the web for current information, news, prices, or anything after your knowledge cutoff.",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query to look up on the web." }
            },
            required: ["query"]
        }
    },
    {
        name: "run_javascript",
        description: "Run secure JavaScript code to solve math problems, logic puzzles, or perform calculations.",
        input_schema: {
            type: "object",
            properties: {
                code: { type: "string", description: "The JS code to execute. You MUST use console.log() to output the answer so you can read it." }
            },
            required: ["code"]
        }
    }
];

// 2. Google Gemini Tool Declarations
const geminiTools = [
    {
        functionDeclarations: [
            {
                name: "web_search",
                description: "Search the web for current information, news, prices, or recent events.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        query: { 
                            type: SchemaType.STRING, 
                            description: "The search query to look up on the web." 
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "run_javascript",
                description: "Run secure JavaScript code to solve math problems, logic puzzles, or perform calculations.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        code: { 
                            type: SchemaType.STRING, 
                            description: "The JS code to execute. You MUST use console.log() to output the answer." 
                        }
                    },
                    required: ["code"]
                }
            }
        ]
    }
];

// 3. Tool Execution Logic
async function executeTool(name, input) {
    try {
        if (name === "web_search") {
            const query = input.query || input;
            console.log(`\n🔍 [Searching Web]: ${query}`);
            const searchResults = await search(query, { safeSearch: "off" });
            
            if (!searchResults.noResults && searchResults.results.length > 0) {
                return searchResults.results.slice(0, 3).map(r => 
                    `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`
                ).join("\n\n---\n\n");
            }
            return "No web results found for this query.";
            
        } else if (name === "run_javascript") {
            const code = input.code || input;
            console.log(`\n💻 [Running Code]:\n${code}`);
            
            // Secure Sandbox using Node VM
            let output = "";
            const sandbox = { 
                console: { log: (...args) => output += args.join(" ") + "\n" },
                Math: Math,
                Date: Date
            };
            
            vm.createContext(sandbox);
            // Run code with a strict 2-second timeout to prevent infinite loops
            vm.runInContext(code, sandbox, { timeout: 2000 });
            
            return output || "Code executed successfully with no output.";
        }
    } catch (error) {
        return `❌ Tool failed with error: ${error.message}.`;
    }
    
    return `Tool ${name} not recognized.`;
}

module.exports = { tools, geminiTools, executeTool };
