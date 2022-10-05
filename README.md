# my-finance 🚧

_I needed something to keep track of my expenses and since I couldn't find anything that fitted my interests, and because it was a simple project to accomplish,
I've decided to come up with my own solution._

my-finance is a **personal backend** (thus meant to be installed on **your** Raspberry, VPS or whatever...) that permits to create wallets, add "variations" to them
(that can be incomings or outcomings) and generate temporal charts for a single wallet or for a group of wallets.

## How to run

#### Requirements
- [A newly created Telegram Bot](https://core.telegram.org/bots#3-how-do-i-create-a-bot)
- Docker

Clone the repository:
```cmd
git clone https://github.com/loryruta/my-finance
cd my-finance
```
Copy `.env.example` to `.env` and value `TELEGRAM_BOT_TOKEN` with your Telegram bot's token.

Instantiate the containers:
```
docker compose up
```

Migrate and seed the DB to the latest version. This commands may also be useful whether upgrading the application:
```
docker compose exec -w /usr/local/app app sh -c "node src/migrate.js"
docker compose exec -w /usr/local/app app sh -c "node src/seed.js"
```

Finally start the application:
```
docker compose exec -w usr/local/app app sh -c "node src/main.js"
```

## How to use

| Command | Description |
| --- | --- |
| `/login`  | Login |
| `/logout` | Logout |
| `/create <title>` | Create a wallet |
| `/select` | Select a wallet to work with |
| `/destroy` | Destroy the selected wallet |
| `/add <amount> [note]` | Add a variation to the selected wallet |
| `/removelast` | Remove the last variation from the selected wallet |
| `/chart [day\|week\|month]` | Generate the temporal chart for the selected wallet |


