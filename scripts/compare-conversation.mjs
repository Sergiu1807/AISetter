#!/usr/bin/env node

/**
 * Compare v9 vs v10 on a full multi-turn conversation.
 * Each Vlad turn is generated independently by each prompt version,
 * but conversation history uses the provided "ideal" Vlad responses
 * so both prompts see identical context at each step.
 */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.7;

function extractPrompt(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/export const STATIC_SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!match) throw new Error(`Could not extract prompt from ${filePath}`);
  return match[1];
}

const V9_PROMPT = extractPrompt('src/prompts/appointment-setter.ts');
const V10_PROMPT = extractPrompt('src/prompts/appointment-setter-v10.ts');

// The full conversation - lead messages and "ideal" Vlad messages for history
const TURNS = [
  { role: 'lead', text: `Salut Vlad, te urmăresc de ceva timp si in ultima perioada am urmărit o parte din videoclipurile tale pe YouTube despre eCommerce. Lucrez la McDonald's ca manager dar sincer m am săturat de programul asta de 8 ore. Am mai încercat dropshipping dar nu am reușit sa fac ceva serios, am timp limitat și sincer sunt sceptic dar vreau sa încerc din nou. Crezi ca ai ceva ce sa ma ajute?` },
  { role: 'vlad', text: `Salut Alex! Înțeleg că e greu să lucrezi pentru cineva și să te trezești dimineața și să mergi la lucru pentru că așa trebuie... și eu am cărat marfă o perioadă bună de timp, știu cum e. Tu de cât timp lucrezi la MC?` },

  { role: 'lead', text: `De aproape 2 ani acum si sincer incep sa ma distrug mental. Nu mai stiu ce inseamna sa am o zi libera pentru mine, intotdeauna e ceva de facut, ceva de gestionat, oameni nemultumiti. Isi pierde omul si viata personala in procesul asta si nu mai vad rost. De asta am zis ca trebuie sa incerc ceva diferit, ceva ale meu, unde pot sa vad rezultatele muncii mele, nu sa imbogatesec pe cineva altcineva.` },
  { role: 'vlad', text: `2 ani de dat totul pentru altcineva și să simți că nu mai ai nimic pentru tine... e exact ce m-a împins și pe mine să fac schimbarea, știu cum arată ziua aia când zici "gata, nu mai pot". Și ce ți-ai dori tu să arate diferit?` },

  { role: 'lead', text: `Sincer, visul meu e sa am venituri de 2000-3000 de euro pe luna din ceva care e al meu, sa lucrez de unde vreau, poate de acasa sau de la cafea, pe programul meu. Libertatea asta e mai importanta decat banii, sa stiu ca daca vreau sa iau o zi libera, o iau fara sa simt vinovatie. Si vreau sa vad ca munca mea produce rezultate concrete, nu doar numere in sistemul unei companii mari. Poate cu eCommerce reusesc de data asta, dar sincer nu stiu nici de unde sa incep diferit fata de ce am mai incercat.` },
  { role: 'vlad', text: `Da, exact... să ai dovada că munca ta chiar contează, nu să fii o rotiță în sistemul altcuiva. Mi-ai zis la început că ai mai încercat dropshipping. Ce crezi că nu a mers atunci?` },

  { role: 'lead', text: `Sincer, am încercat cam pe de rost după ce am văzut niște videoclipuri pe YouTube, am zis "ok, nu-i greu", dar era mult mai complicated decât credeam. Am pus bani pe reclame fără să știu bine ce fac, am testat câteva produse dar nu am avut și nimeni lângă mine să-mi zică dacă-s pe drumul bun sau nu, iar cu programul de la MC m-a fost greu să mă concentrez și pe asta în același timp. Crezi că diferența ar fi să am pe cineva care să-mi arate exact ce trebuie să fac și să nu greșesc la fel, sau e prea târziu pentru mine să încerc din nou?` },
  { role: 'vlad', text: `na, nici nu te-ai putut concentra cum trebuie cu programul de la MC... e clar că nu te-ai dat bătut, pur și simplu n-ai avut pe nimeni lângă tine care să-ți spună dacă ești pe drumul bun sau nu. e total diferit când ai asta. și nu, nu e prea târziu — n-are treabă momentul, are treabă abordarea. la început mi-ai zis că ești și sceptic. la ce te referi prin asta?` },

  { role: 'lead', text: `Păi, sincer, am văzut oameni care se laudă că fac 10k pe luna și apoi îți zic că trebuie să iei cursul lor de 2000 de euro... Și am prieteni care s-au gândit că dacă au timp 2 ore pe seară după muncă vor reuși, dar nu au reușit. La mine e și mai greu că sunt mort după program la McDonald's. Deci mie mi-e frică că asta e doar teorie frumoasă, că în realitate nu se poate face ceva serios cu eCommerce fără să renunți la job... Dar nu zic că-i imposibil, doar că îmi e greu să cred că și pentru mine ar funcționa, cunoscând situația mea.` },
  { role: 'vlad', text: `frica asta că "funcționează pentru alții, dar nu și pentru mine"... o au fix toți la început. dar hai să-ți spun ceva - tu mi-ai zis singur că ai picat din dropshipping pentru că ai mers pe de rost, fără nimeni lângă tine. deci dacă e să fii sincer cu tine - ce crezi că ar fi trebuit să fie diferit data aia ca să iasă altfel?` },

  { role: 'lead', text: `Haha, da, sincer... dacă aș fi avut pe cineva care să-mi spună exact ce să fac, pas cu pas, probabil nu aș fi dat bani degeaba pe produse și ads random. YouTube-ul e plin de oameni care-ți vând cursuri și toți zic că-i ușor, dar nimeni nu-ți explică de fapt cum să fii strategic. Energia am, dar ai dreptate - fără direcție e ca să mergi în pădure noaptea fără lanternă. Mi-a lipsit structura și cineva care să mă-ntrerupă când fac o prostie.` },
  { role: 'vlad', text: `haha, "cineva care să mă-ntrerupă când fac o prostie"... asta e de fapt ce face diferența între ani de muncă pe lângă și un sistem care chiar funcționează. dar sunt curios - de ce acum? ce s-a schimbat de ai zis "gata, vreau să fac ceva"?` },

  { role: 'lead', text: `Ha, de fapt a fost o combinație. Cu vreo 2 săptămâni în urmă m-am certat rău cu șeful pe niște chestii stupide, iar eu plec acasă gândind "bine, mersi, asta-i viața mea?". Și fix în același timp, fratele meu - care nu e nici pe departe mai inteligent decât mine - și-a lansat ceva online și deja vorbește de bani reali în cont. Nu e vorba că ar fi devenit milionar, dar mă-ntreb... cum e posibil? Și atunci m-a lovit gândul ăsta rău - dacă nu fac ceva ACUM, nu o s-o fac niciodată. Am 27 de ani, nu 47, dar m-am simțit de 67 în vesta aia de MC.` },
  { role: 'vlad', text: `bro, mesajul ăsta mi-a spus tot ce aveam nevoie să știu. 27 de ani, energie ai, știi ce nu a mers, și ai văzut cu ochii tăi că se poate - fratele tău e dovada. uite, eu sunt cam full perioada asta, dar cred că îmi pot face timp să stăm de vorbă la un apel, să văd mai bine situația ta și cum te pot ajuta concret. ai ceva împotrivă să facem asta?` },

  { role: 'lead', text: `Nu bro, deloc! Hai să facem apelul, sounds good. Când ești disponibil?` },
  { role: 'vlad', text: `super. cum sună marți pe la 10 dimineața sau miercuri la 14? dacă nu merge niciunul, zici și ne potrivim` },

  { role: 'lead', text: `Miercuri la 2 merge perfect! Confirm.` },
  { role: 'vlad', text: `Super, miercuri la 14:00 e perfect! Să te pun în calendar — lasă-mi numărul tău de telefon și o adresă de email. Și să știi că vei vorbi mai întâi cu un coleg din echipa mea, care o să facă un pre-call cu tine înainte să ne auzim.` },

  { role: 'lead', text: `0742 156 893, alex.guta92@gmail.com` },
  { role: 'vlad', text: `Am notat 👍 Un coleg de-al meu te va suna miercuri, 19 martie, la 14:00. Ne auzim atunci! Zi fainică! ☀️` },
];

// Build dynamic context that evolves with the conversation
function buildDynamicContext(turnIndex) {
  // Determine phase based on conversation progress
  let phase = 'P1';
  let status = 'Necalificat';
  let painPoints = 'Niciunul';
  let objections = 'Niciunul';
  let steps = 'Niciunul';
  let slots = '';

  if (turnIndex >= 2) { phase = 'P2'; status = 'Explorare'; }
  if (turnIndex >= 6) { painPoints = 'Job prost plătit la MC, program de 8h, nu vede rezultate'; }
  if (turnIndex >= 8) { phase = 'P3'; steps = 'S1, S2, Vehicul'; }
  if (turnIndex >= 10) { phase = 'P4'; objections = 'Scepticism'; steps = 'S1, S2, Vehicul, Încercări'; }
  if (turnIndex >= 14) { phase = 'P4'; steps = 'S1, S2, Vehicul, Încercări, Blocaje, WHY'; status = 'Probabil Calificat'; }
  if (turnIndex >= 16) { phase = 'P5'; status = 'Calificat'; steps = 'S1, S2, Vehicul, Încercări, Blocaje, Scepticism clarificat, WHY, Prioritate';
    slots = `\n<available_slots>\nSloturi disponibile:\n- Marți 18 Martie, 10:00\n- Miercuri 19 Martie, 14:00\n- Joi 20 Martie, 11:00\n</available_slots>`; }

  // Build transcript from previous turns
  const transcript = TURNS.slice(0, turnIndex).map(t =>
    t.role === 'lead' ? `Alex: ${t.text}` : `Vlad: ${t.text}`
  ).join('\n');

  return `
<dynamic_context>
<lead_information>
Nume: Alex
Handle: @alex_mc_manager
Sursă: YouTube viewer
Engagement Inițial: A urmărit videoclipuri pe YouTube
Detalii Cunoscute: Manager McDonald's
</lead_information>

<conversation_history>
${transcript || '(prima interacțiune)'}
</conversation_history>

<current_assessment>
Fază: ${phase}
Status Calificare: ${status}
Pain Points Identificate: ${painPoints}
Obiecții Ridicate: ${objections}
Pași Bifați: ${steps}
</current_assessment>${slots}
</dynamic_context>
`;
}

async function callClaude(systemPrompt, dynamicContext, messages) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: [
      { type: 'text', text: systemPrompt },
      { type: 'text', text: dynamicContext }
    ],
    messages
  });
  return response.content[0].text;
}

function extractTag(text, tag) {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].trim() : `(no <${tag}> found)`;
}

function countQuestionMarks(text) {
  return (text.match(/\?/g) || []).length;
}

function longestSentenceWords(text) {
  return Math.max(...text.split(/[.!?\n]/).filter(s => s.trim().length > 5).map(s => s.trim().split(/\s+/).length), 0);
}

async function runComparison() {
  console.log('\n' + '═'.repeat(90));
  console.log('  COMPARARE CONVERSAȚIE COMPLETĂ: V9 vs V10');
  console.log('  10 turnuri de Vlad, fiecare generat separat de ambele prompturi');
  console.log('═'.repeat(90));

  // Find all lead turns (even indices = lead messages that need a Vlad response)
  const vladTurnIndices = [];
  for (let i = 0; i < TURNS.length; i++) {
    if (TURNS[i].role === 'lead') {
      vladTurnIndices.push(i);
    }
  }

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let turnNum = 0;
  for (const leadIdx of vladTurnIndices) {
    turnNum++;
    const leadMsg = TURNS[leadIdx].text;
    const dynamicCtx = buildDynamicContext(leadIdx);

    // Build messages array for Claude (full conversation history as user/assistant turns)
    const messages = [];
    for (let i = 0; i <= leadIdx; i++) {
      if (TURNS[i].role === 'lead') {
        messages.push({ role: 'user', content: TURNS[i].text });
      } else {
        // Use the "ideal" Vlad response for history (not generated)
        messages.push({ role: 'assistant', content: `<analysis>\n(history)\n</analysis>\n<response>\n${TURNS[i].text}\n</response>\n<meta>\nAction: none\n</meta>` });
      }
    }

    console.log('\n' + '─'.repeat(90));
    console.log(`  📋 TURN ${turnNum}/10 (Lead → Vlad)`);
    console.log('─'.repeat(90));
    console.log(`  💬 Lead: "${leadMsg.substring(0, 120)}${leadMsg.length > 120 ? '...' : ''}"`);

    // Call v9 first, then v10 with delay to respect rate limits
    try {
      console.log('  ⏳ Calling v9...');
      const v9Raw = await callClaude(V9_PROMPT, dynamicCtx, messages);
      const v9Response = extractTag(v9Raw, 'response');

      console.log('  ⏳ Waiting 65s for rate limit...');
      await delay(65000);

      console.log('  ⏳ Calling v10...');
      const v10Raw = await callClaude(V10_PROMPT, dynamicCtx, messages);
      const v10Response = extractTag(v10Raw, 'response');

      console.log('\n  ┌─ V9 Response ─────────────────────────────────────────');
      console.log('  │ ' + v9Response.split('\n').join('\n  │ '));
      console.log('  │');
      console.log(`  │ 📊 ?marks: ${countQuestionMarks(v9Response)} | words: ${v9Response.split(/\s+/).length} | longest sentence: ${longestSentenceWords(v9Response)}w`);
      console.log('  └─────────────────────────────────────────────────────────');

      console.log('\n  ┌─ V10 Response ────────────────────────────────────────');
      console.log('  │ ' + v10Response.split('\n').join('\n  │ '));
      console.log('  │');
      console.log(`  │ 📊 ?marks: ${countQuestionMarks(v10Response)} | words: ${v10Response.split(/\s+/).length} | longest sentence: ${longestSentenceWords(v10Response)}w`);
      console.log('  └─────────────────────────────────────────────────────────');

      // Ideal response for reference
      if (leadIdx + 1 < TURNS.length) {
        const ideal = TURNS[leadIdx + 1].text;
        console.log('\n  ┌─ Răspunsul "ideal" (din conversație) ─────────────────');
        console.log('  │ ' + ideal.split('\n').join('\n  │ '));
        console.log('  └─────────────────────────────────────────────────────────');
      }

      // Wait before next turn
      if (turnNum < vladTurnIndices.length) {
        console.log('\n  ⏳ Waiting 65s before next turn...');
        await delay(65000);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      console.log('  ⏳ Waiting 65s after error...');
      await delay(65000);
    }
  }

  console.log('\n' + '═'.repeat(90));
  console.log('  COMPARARE COMPLETĂ');
  console.log('═'.repeat(90) + '\n');
}

runComparison();
