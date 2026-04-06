#!/usr/bin/env node

/**
 * Test script for prompt v10
 *
 * Usage:
 *   node scripts/test-prompt-v10.mjs                    # Run all 5 standard scenarios
 *   node scripts/test-prompt-v10.mjs "mesajul tau"      # Test a single message
 *   node scripts/test-prompt-v10.mjs --interactive       # Interactive chat mode
 *   node scripts/test-prompt-v10.mjs --compare "mesaj"   # Compare v9 vs v10 side by side
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { createInterface } from 'readline';
import { config } from 'dotenv';

config(); // Load .env

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;

// Extract prompt text from TS file
function extractPrompt(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const staticMatch = content.match(/export const STATIC_SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!staticMatch) throw new Error(`Could not extract STATIC_SYSTEM_PROMPT from ${filePath}`);
  return staticMatch[1];
}

const V10_PROMPT = extractPrompt('src/prompts/appointment-setter-v10.ts');
const V9_PROMPT = extractPrompt('src/prompts/appointment-setter.ts');

const DYNAMIC_CONTEXT = `
<dynamic_context>
<lead_information>
Nume: Alex
Handle: @alex_test
Sursă: Story reaction
Engagement Inițial: Reacție la story
Detalii Cunoscute: Niciuna
</lead_information>

<conversation_history>
(prima interacțiune)
</conversation_history>

<current_assessment>
Fază: P1
Status Calificare: Necalificat
Pain Points Identificate: Niciunul
Obiecții Ridicate: Niciunul
Pași Bifați: Niciunul
</current_assessment>
</dynamic_context>
`;

// Standard test scenarios
const SCENARIOS = [
  {
    name: '1. Reacție la story (opener minimal)',
    message: '🔥',
    context: DYNAMIC_CONTEXT
  },
  {
    name: '2. Întrebare de preț',
    message: 'salut. cat costa mentoratul?',
    context: DYNAMIC_CONTEXT
  },
  {
    name: '3. Prospect sceptic',
    message: 'Nu știu... am mai dat bani pe cursuri și n-a mers. Sunt un pic sceptic sincer.',
    context: DYNAMIC_CONTEXT.replace('Fază: P1', 'Fază: P4')
      .replace('Status Calificare: Necalificat', 'Status Calificare: Explorare')
      .replace('(prima interacțiune)',
        'Vlad: Salut! Povestește-mi despre situația ta\nAlex: Lucrez de 2 ani ca electrician, am mai incercat un curs de ecommerce dar n-a mers')
  },
  {
    name: '4. Mesaj lung cu multe info',
    message: 'Salut Vlad! Am 22 de ani, sunt din Bacău, momentan sunt student în anul 3 la sport aici în București și lucrez part time la Bershka. Știu de ceva timp de ideea asta de magazin online, la fel și cu ce te ocupi tu. Iar acum am decis că aș vrea un mentor care să mă ghideze.',
    context: DYNAMIC_CONTEXT
  },
  {
    name: '5. Ready for booking',
    message: 'da vlad, chiar vreau sa fac asta. sunt gata sa incep, zi-mi ce trebuie sa fac',
    context: DYNAMIC_CONTEXT
      .replace('Fază: P1', 'Fază: P5')
      .replace('Status Calificare: Necalificat', 'Status Calificare: Calificat')
      .replace('Nume: Alex', 'Nume: Rareș')
      .replace('Pain Points Identificate: Niciunul', 'Pain Points Identificate: Job prost plătit, vrea independență')
      .replace('Pași Bifați: Niciunul', 'Pași Bifați: S1, S2, Vehicul, Încercări, Blocaje, WHY, Prioritate')
      .replace('(prima interacțiune)',
        'Vlad: Salut! Povestește-mi despre situația ta\nRareș: Lucrez la Bershka de 2 ani, vreau sa fac ecommerce\nVlad: Cum merge la Bershka?\nRareș: E greu, program lung, bani putini\nVlad: Și ce schimbare îți dorești?\nRareș: Vreau sa castig 3000-4000 euro pe luna din ecommerce\nVlad: Ce ai mai incercat pana acum?\nRareș: Am citit pe net dar n-am facut nimic concret\nVlad: Ce simți că te oprește?\nRareș: Nu stiu de unde sa incep si mi-e frica sa nu pierd bani\nVlad: E normal. Tu când ai evoluat cel mai mult - când erai relaxat sau când te-ai forțat un pic?\nRareș: Cand m-am fortat, ai dreptate')
      .replace('</dynamic_context>',
        '<available_slots>\nSloturi disponibile:\n- Luni 14 Aprilie, 14:00\n- Marți 15 Aprilie, 10:00\n- Miercuri 16 Aprilie, 16:00\n</available_slots>\n</dynamic_context>')
  }
];

async function callClaude(systemPrompt, dynamicContext, userMessage) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: [
      { type: 'text', text: systemPrompt },
      { type: 'text', text: dynamicContext }
    ],
    messages: [{ role: 'user', content: userMessage }]
  });
  return response.content[0].text;
}

function extractResponse(fullOutput) {
  const match = fullOutput.match(/<response>([\s\S]*?)<\/response>/);
  return match ? match[1].trim() : '(no <response> tag found)';
}

function extractAnalysis(fullOutput) {
  const match = fullOutput.match(/<analysis>([\s\S]*?)<\/analysis>/);
  return match ? match[1].trim() : '(no <analysis> tag found)';
}

// ─── Run all scenarios ───
async function runAllScenarios() {
  console.log('\n' + '═'.repeat(80));
  console.log('  PROMPT V10 - TEST 5 SCENARII STANDARD');
  console.log('═'.repeat(80));

  for (const scenario of SCENARIOS) {
    console.log('\n' + '─'.repeat(80));
    console.log(`  📋 ${scenario.name}`);
    console.log(`  💬 Lead: "${scenario.message.substring(0, 80)}${scenario.message.length > 80 ? '...' : ''}"`);
    console.log('─'.repeat(80));

    try {
      const result = await callClaude(V10_PROMPT, scenario.context, scenario.message);
      const response = extractResponse(result);
      const analysis = extractAnalysis(result);

      console.log('\n  🤖 Bot response:');
      console.log('  ' + response.split('\n').join('\n  '));
      console.log('\n  🧠 Analysis (intern):');
      console.log('  ' + analysis.split('\n').join('\n  '));

      // Quick quality checks
      const questionMarks = (response.match(/\?/g) || []).length;
      const wordCount = response.split(/\s+/).length;
      const longestSentence = Math.max(...response.split(/[.!?]/).filter(s => s.trim()).map(s => s.trim().split(/\s+/).length));

      console.log('\n  📊 Quality checks:');
      console.log(`     Semne de întrebare: ${questionMarks} ${questionMarks > 1 ? '⚠️ PREA MULTE!' : '✓'}`);
      console.log(`     Cuvinte total: ${wordCount} ${wordCount > 60 ? '⚠️ PREA LUNG!' : '✓'}`);
      console.log(`     Cea mai lungă propoziție: ${longestSentence} cuvinte ${longestSentence > 20 ? '⚠️ PESTE 20!' : '✓'}`);
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('  TEST COMPLET');
  console.log('═'.repeat(80) + '\n');
}

// ─── Compare v9 vs v10 ───
async function compareVersions(message) {
  console.log('\n' + '═'.repeat(80));
  console.log('  COMPARE: V9 vs V10');
  console.log(`  💬 Message: "${message}"`);
  console.log('═'.repeat(80));

  const [v9Result, v10Result] = await Promise.all([
    callClaude(V9_PROMPT, DYNAMIC_CONTEXT, message),
    callClaude(V10_PROMPT, DYNAMIC_CONTEXT, message)
  ]);

  console.log('\n  ── V9 Response ──');
  console.log('  ' + extractResponse(v9Result).split('\n').join('\n  '));

  console.log('\n  ── V10 Response ──');
  console.log('  ' + extractResponse(v10Result).split('\n').join('\n  '));

  console.log('\n  ── V9 Analysis ──');
  console.log('  ' + extractAnalysis(v9Result).split('\n').join('\n  '));

  console.log('\n  ── V10 Analysis ──');
  console.log('  ' + extractAnalysis(v10Result).split('\n').join('\n  '));

  console.log('\n' + '═'.repeat(80) + '\n');
}

// ─── Interactive mode ───
async function interactiveMode() {
  console.log('\n' + '═'.repeat(80));
  console.log('  INTERACTIVE MODE - V10 PROMPT');
  console.log('  Scrie mesaje ca prospect. "quit" pentru ieșire.');
  console.log('  "v9:" prefix pentru a testa cu v9 în loc de v10.');
  console.log('═'.repeat(80));

  const messages = [];
  let currentContext = DYNAMIC_CONTEXT;

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question('\n  🧑 Tu: ', async (input) => {
      if (input.toLowerCase() === 'quit') {
        rl.close();
        return;
      }

      const useV9 = input.startsWith('v9:');
      const actualMessage = useV9 ? input.slice(3).trim() : input;
      const prompt = useV9 ? V9_PROMPT : V10_PROMPT;

      messages.push({ role: 'user', content: actualMessage });

      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          temperature: TEMPERATURE,
          system: [
            { type: 'text', text: prompt },
            { type: 'text', text: currentContext }
          ],
          messages: messages
        });

        const fullText = response.content[0].text;
        const botResponse = extractResponse(fullText);

        console.log(`\n  🤖 ${useV9 ? '[V9]' : '[V10]'} Vlad: ${botResponse}`);

        messages.push({ role: 'assistant', content: fullText });
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
      }

      ask();
    });
  };

  ask();
}

// ─── Main ───
const args = process.argv.slice(2);

if (args.length === 0) {
  runAllScenarios();
} else if (args[0] === '--interactive') {
  interactiveMode();
} else if (args[0] === '--compare') {
  const message = args.slice(1).join(' ') || '🔥';
  compareVersions(message);
} else {
  // Single message test
  const message = args.join(' ');
  console.log(`\n  Testing v10 with: "${message}"\n`);
  callClaude(V10_PROMPT, DYNAMIC_CONTEXT, message).then(result => {
    console.log('  🤖 Response:', extractResponse(result));
    console.log('\n  🧠 Analysis:', extractAnalysis(result));
  });
}
