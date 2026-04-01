const fs = require('fs');
let c = fs.readFileSync('__tests__/api/summarize.test.ts', 'utf8');

// Fix the group error
c = c.replace(/group: 'llama-3\.3-70b-versatile'/g, "group: 'groq'");

// Fix tokensUsed typing, since sometimes tokensUsed isn't there or is typed differently
// In __tests__/api/summarize.test.ts there were lines like modelUsed: 'llama-3.3-70b-versatile'
// Let's just run jest --passWithNoTests and see the TS errors

fs.writeFileSync('__tests__/api/summarize.test.ts', c);
