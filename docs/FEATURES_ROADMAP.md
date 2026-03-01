# Features Roadmap

## Completed

- [x] Railway Express backend migration
- [x] GHL calendar integration (live slots + automatic booking)
- [x] Rescue booking (match slots from confirmation messages)
- [x] Message chunking randomization (1-6 messages, bell-curve distribution)
- [x] Project cleanup & organization

## In Progress

### 2. Media Processing (Imagini, Voice Notes, Video)
- **Model:** Gemini 2.5 Flash
- **Scope:** Procesare imagini, voice notes și video trimise de prospecți prin Instagram DM
- **Flow:** ManyChat → media URL → Gemini → text description → Claude
- **Status:** In implementare

## Planned

### 1. Delay între mesaje (typing simulation)
- **Scope:** Adăugare delay-uri randomizate (2-8 sec) între mesajele multiple din ManyChat
- **Implementare:** Configurare în ManyChat response flow (Smart Delay / Typing action)
- **Efort:** Low — doar config ManyChat, fără cod

### 3. Dashboard Analytics Îmbunătățit
- **Scope:** Conversion funnel (P1→P7→booked), timp mediu conversie, rate răspuns per fază
- **Efort:** Medium

### 4. Training Loop
- **Scope:** Marchezi conversații reușite → extragi training data → îmbunătățești prompt
- **Tabele existente:** `training_examples`, `knowledge_base` (nefolosite momentan)
- **Efort:** Medium-High

### 5. Smart Follow-up
- **Scope:** Mesaj automat personalizat la prospecți care nu răspund de 24-48h
- **Implementare:** Cron job pe Railway + Claude generează follow-up bazat pe ultima conversație
- **Efort:** Medium
