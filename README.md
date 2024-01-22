# Remember It Wholesale

A simple way to organize points of interest and pieces of data in your life. Also a way for me to practice Angular and keep up to date with their releases. Uses PrimeNG for the component suite.

You can create different Templates (for whatever you want, like Birthday, Dinner, Boardgame Night, Commute, Allergies, etc.) with a set of customizable and arbitrary fields.

Then you can create Things from those Templates, for specific instances of each event in time. They can also be set as a reminder.

Data is fully searchable with table-level filters and a global search.

There's more features planned, see `TODO.md` for details.

### Setup and Running

For simplicity and future proofing for my own deployment, no database is used, just flat JSON files in `~/.rememberitwholesale/`

New accounts are requested manually via email, see `config/default.json` for setup of Mailjet

- Use Node v20+
- See `npm run` for options, but:
  - `npm run backend`: Start up the Node instance to back the app
  - `npm run (dev|prod)`: Deploy the Angular app locally for development or prod
