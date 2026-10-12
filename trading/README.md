# Sam's paper trading desk

Python 3 standard-library service, SQLite, vanilla JS dashboard, nginx and systemd. Paper only: there is no private exchange API, API key storage, real order submission, leverage or withdrawal capability.

## Use

Production URL after deployment: https://samlatif.uk/trading/
The installer generates a random password in `/root/sam-trading-login.txt`, readable only by root. Read it using your trusted VPS console; do not put it in GitHub or chat. The dashboard needs only the password. Login sessions expire after eight hours or a restart. Credentials are separate from the existing analytics login.

The bot starts paused. Review settings, wait for a healthy feed and click Start bot. Default paper capital is $10,000, BTC/USD, 5-minute candles, 9/21 SMA trend, 10% position allocation, 3% stop loss, 6% take profit, 2% UTC daily equity loss cap, 40 bps fees and 10 bps slippage. These are illustrative modelling settings, not a recommendation or an assertion about actual exchange fees.

Pause and emergency stop suspend automatic exits as well as entries and retain the position. Close position & pause simulates a market liquidation using a fresh mark. Emergency stop latches a halt. Acknowledge halt clears the latch, but does not reset the daily equity baseline; restarting below the daily loss threshold halts again. Restart always pauses. Settings can change only when paused and flat. The paper account cannot be reset through the UI, preserving the audit history.

Dashboard includes equity curve, P&L, cash, positions, latest 200 fills, complete CSV export, configuration, risk controls, recent events, feed health and a short-window backtest. No pending orders: paper market fills are immediate. External email/push alerts, multi-user roles, multiple concurrent strategies and live trading are not implemented.

## Modelling limitations

Kraken OHLC is polled every 30 seconds. The final unfinished candle is excluded from signals, and its latest price is used as the paper mark. A failed request or an update older than 90 seconds prevents execution. Stop losses are polled and can fill beyond their threshold. Fees and adverse slippage are applied on both sides. Equity marks exclude estimated future exit costs; realized P&L includes both entry and exit costs.

Backtests use up to 719 completed candles and next-bar open fills. They do not change the paper account. Risk checks occur only at sampled opens; there is no intrabar stop modelling, order book, latency model or historical outage simulation. A daily-loss halt stays latched for the remaining backtest. Short samples are diagnostics, not evidence of expected profitability. Market API: https://docs.kraken.com/api-reference/market-data/get-ohlc-data

## Deployment

In `samlatif-uk/cv`, put application files in `trading/` and the workflow at `.github/workflows/deploy-trading-vps.yml`. Main-branch pushes deploy after tests. Uses existing VPS_HOST, VPS_PORT, VPS_USER, VPS_SSH_KEY and verified VPS_HOST_KEY_SHA256 secrets. Defaults match the existing repository workflow. Does not read secret values, alter existing app deployments, install exchange credentials or start the strategy automatically.

Requires root SSH deployment, Python 3.10+, nginx, systemd, outbound HTTPS to api.kraken.com, and an enabled apex vhost with `/var/www/samlatif.uk` as its web root. Existing TLS must work. The installer validates nginx and restores modified nginx files on validation failure. Code goes to `/opt/sam-trading`, the database to `/var/lib/sam-trading`, and the service listens only on `127.0.0.1:4181`. A consistent database backup is taken on upgrades. Retain backups according to your storage policy; no automatic deletion is configured.

Check service: `systemctl status sam-trading`; logs: `journalctl -u sam-trading`. Stop service: `systemctl stop sam-trading`. Roll back code by deploying a prior reviewed version; preserve the database and credentials. Remove the trading nginx include and validate nginx if removing the public route. Future edits replacing the apex vhost must preserve its trading include.

## Local development

Set `TRADING_PASSWORD_SHA256` to the hex SHA-256 of a development-only password, `TRADING_LOCAL=1` (allows non-Secure local cookies) and `TRADING_DB` to a local database path. Run `python server.py`, then visit http://127.0.0.1:4181/trading/. Never set TRADING_LOCAL in production. The server is intended to sit behind nginx, not serve public traffic directly.

Tests: `python -m unittest discover -s . -p 'test_*.py'`; JS syntax: `node --check static/app.js`.
