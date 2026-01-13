# Zovea Talent — Applicant Tracking System (ATS)

Een eenvoudige, volledig te integreren ATS webapp (NL) met rollen:
- **Eigenaar (Owner)**: volledige toegang
- **Kliniek (Client)**: eigen profiel + documenten + kandidaattrajecten
- **Kandidaat (Candidate)**: eigen profiel + trajecten (kliniek pas zichtbaar zodra gekoppeld)

## Snel starten (lokaal)

1) Kopieer env:

```bash
cp .env.example .env
```

2) Installeer dependencies:

```bash
npm install
```

3) Database migratie + seed (demo accounts):

```bash
npm run db:migrate
npm run seed
```

4) Start de server:

```bash
npm run dev
```

Open daarna `http://localhost:3000`.

## Demo logins (na seed)

- **Eigenaar**: `eigenaar@zovea.local` / `Zovea!12345`
- **Kliniek**: `client@kliniek.local` / `Zovea!12345`
- **Kandidaat**: `kandidaat@zovea.local` / `Zovea!12345`

## Email (optioneel)

Voor “document direct mailen” zet SMTP variabelen in `.env`:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Zonder SMTP draait de app in **dev-modus** en “verstuurt” hij de mail als JSON-output in de server logs.


