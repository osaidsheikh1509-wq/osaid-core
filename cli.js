const readline = require('readline');
const { askAgent } = require('./agent');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("=========================================");
console.log("🤖 Personal AI Agent CLI Started");
console.log("Type your question and press Enter.");
console.log("Type 'exit' to quit.");
console.log("=========================================\n");

function promptUser() {
    rl.question('\nYou: ', async (input) => {
        if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
            console.log('Goodbye!');
            rl.close();
            return;
        }
        
        if (input.trim() === '') {
            promptUser();
            return;
        }
        
        process.stdout.write("Agent is thinking...");
        
        // Call our core agent
        const reply = await askAgent(input);
        
        // Clear the "Agent is thinking..." line
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        
        console.log(`\n🤖 Agent:\n${reply}`);
        
        // Loop back and wait for the next question
        promptUser();
    });
}

// Start the loop!
promptUser();
