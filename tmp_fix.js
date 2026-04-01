const fs = require('fs');

const file = '__tests__/api/summarize.test.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the array of models in the GET test
content = content.replace(/mockedGetAvailableModels\.mockResolvedValue\(\[\s+[\s\S]+?\]\);/g, `mockedGetAvailableModels.mockResolvedValue([
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', available: true, group: 'groq' },
      ]);`);

// Replace occurrences in the GET test assertion
content = content.replace(/expect\(data\.models\)\.toHaveLength\(6\);/g, `expect(data.models).toHaveLength(1);`);
content = content.replace(/id: 'glm-4\.7',/g, `id: 'llama-3.3-70b-versatile',`);
content = content.replace(/name: 'GLM-4\.7',/g, `name: 'Llama 3.3 70B (Groq)',`);
content = content.replace(/group: 'zai',/g, `group: 'groq',`);

// Replace hardcoded "glm-4.7" and "gemini" everywhere with "llama-3.3-70b-versatile"
content = content.replace(/'glm-4\.7'/g, `'llama-3.3-70b-versatile'`);
content = content.replace(/'gemini'/g, `'llama-3.3-70b-versatile'`);
content = content.replace(/'groq'/g, `'llama-3.3-70b-versatile'`);

// Specifically for the LLM Failures test, adjust the error message
content = content.replace(/All models failed\. Errors: glm-4\.7: API error; gemini: API error; groq: API error; openai: API error/g, `All models failed. Errors: llama-3.3-70b-versatile: API error`);

// Fix type errors for stream parsing predicates
// The issue is: events.find((e: StreamEvent) => e.type === 'error')
// Typescript doesn't like passing typed function to `.find` when array is `object[]`
// We need to change `const events: object[] = [];` to `const events: StreamEvent[] = [];` in `parseStreamResponse`
content = content.replace(/const events: object\[\] = \[\];/g, `const events: StreamEvent[] = [];`);
content = content.replace(/Promise<object\[\]>/g, `Promise<StreamEvent[]>`);
content = content.replace(/events\.push\(JSON\.parse\(line\)\);/g, `events.push(JSON.parse(line) as StreamEvent);`);
content = content.replace(/events\.push\(JSON\.parse\(buffer\)\);/g, `events.push(JSON.parse(buffer) as StreamEvent);`);

// For "Should not have building_timeline stage when no timestamps"
// It uses .filter and .map on events. We don't need to change `e: StreamEvent` because events is now `StreamEvent[]`.
// But wait, typescript compiler might still complain about `e.stage` if it thinks it might be ErrorEvent.
// So replace `(e: StreamEvent) => e.stage` with `(e) => (e as ProgressEvent).stage`
content = content.replace(/\(e: StreamEvent\) => e\.stage/g, `(e) => (e as ProgressEvent).stage`);

// Fix the typescript error Type 'true' is not assignable to type 'never' in app/api/security-questions/route.ts
// (Already done manually by upsert)

// Also fix `const stages = events.filter((e: StreamEvent) => e.type === 'progress').map((e: StreamEvent) => e.stage);`
// to be `.map((e) => (e as ProgressEvent).stage)`
content = content.replace(/\.map\(\(e: StreamEvent\) => e\.stage\)/g, `.map((e) => (e as ProgressEvent).stage)`);

fs.writeFileSync(file, content);
console.log('Fixed summarize.test.ts');
