# Tränarverktyg – Lagindelare (U8)

En enkel webbapp för tränare:
- Slumpa två lag med **1 målvakt per lag** (om möjligt)
- **Drag & drop** för att flytta spelare mellan lag / utanför lag
- **Lås** spelare i ett lag inför ny slumpning
- **Kopiera** lag till urklipp (för att klistra i WhatsApp/SMS)
- Spara **historik** (datum + lag) lokalt i webbläsaren

> I denna version sparas allt i webbläsarens LocalStorage. Appen är förberedd för att senare kunna kopplas till backend/databas (t.ex. Supabase) utan att UI:t behöver göras om.

## Kom igång lokalt

1. Installera Node.js (18+ rekommenderas)
2. I projektmappen:

```bash
npm install
npm run dev
```

Öppna sedan `http://localhost:3000`.

## Deploy (Vercel)

1. Skapa ett repo på GitHub och pusha upp koden
2. Importera projektet i Vercel
3. Build command: `npm run build`
4. Output: hanteras automatiskt av Next.js

## Hur du använder appen

1. Lägg in spelare i listan (t.ex. `Leo P`)
2. Markera vilka som är målvakter
3. (Valfritt) Avmarkera spelare som inte är med idag
4. Klicka **Slumpa lag**
5. Dra spelare mellan lag för finjustering
6. Klicka **Spara** för att lägga in i historiken

## Nästa steg (förslag)

- Synka historik mellan flera tränare (Supabase)
- Träningsbank (övningar) + träningspass
- “Undvik att samma spelare hamnar ihop” (pairing-historik)
- PIN-kod för tränarläge
