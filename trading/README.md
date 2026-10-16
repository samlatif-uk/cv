# Sam's paper trading desk

Python 3 standard-library service, SQLite, vanilla JS dashboard, nginx and systemd. Paper only: there is no private exchange API, API key storage, real order submission, leverage or withdrawal capability.

## Use

Production URL after deployment: https://samlatif.uk/trading/
The installer generates a random password in `/root/sam-trading-login.txt`, readable only by root. Read it using your trusted VPS console; do not put it in GitHub or chat. The dashboard needs only the password. Login sessions expire after eight hours or a restart. Credentials are separate from the existing analytics login.

The bot starts paused. Wait for a healthy feed and click Start bot. Automatic research is enabled by default, with no settings to tune. Default paper capital is $10,000, BTC/USD, hourly candles, automatic trend/breakout/RSI selection, 10% position allocation, 3% stop loss, 6% take profit, 2% UTC daily equity loss cap, 40 bps fees and 10 bps slippage. These are illustrative modelling settings, not a recommendation or an assertion about actual exchange fees.

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

## Intelligence workspace

Open `/trading/intelligence/` using the same login. This independent implementation is inspired by the public workflow in [the Sikt Intelligence walkthrough](https://www.youtube.com/watch?v=W2E-rN2sgs0), not its proprietary prediction engine or branding.

Create a binary question with explicit resolution rules and a timezone-aware deadline. Record manual forecasts, source links and optional market-odds snapshots. Forecasts are timestamped and cannot be edited; wording locks after the first forecast. Resolve YES, NO or VOID after the deadline with an evidence URL and explanation. Resolution is final. Brier scores use the first pre-deadline forecast for each resolved non-void question. The optional market benchmark has its own sample count and uses only supplied market snapshots. No forecasts, predictions or historical performance are seeded.

Market odds are manually entered and not independently verified or automatically refreshed. Comparison gaps are percentage points, not a profitability claim. This workspace never controls the trading bot or submits prediction-market bets. Custom stock or world-event questions do not add stock trading support to the crypto bot. Source links are stored and displayed, never fetched by the application itself.

### Optional AI configuration

AI is disabled by default, as requested. On the VPS use `sudoedit /etc/sam-trading.env` and add `OPENAI_API_KEY`, `INTELLIGENCE_MODEL` (a model available to your account supporting Responses, web search and structured outputs), `INTELLIGENCE_ENABLED=1`, and optionally `INTELLIGENCE_DAILY_JOBS=10`. Keep this file root-only; never commit it or paste keys into the dashboard. Restart with `sudo systemctl restart sam-trading`; this pauses trading. Configure provider spending limits separately: the job cap bounds requests, not currency spend.

A refinement uses one API request and requires explicit adoption of its suggested wording. A forecast uses one research request with at most five web-search tool calls, then three separate prompts to the same model for base-rate, evidence and sceptical perspectives. Their arithmetic mean is displayed, with each perspective available. This is not an ensemble of independent models or a calibrated forecast. Questions, rules and retrieved research are sent to OpenAI only when a user starts an AI job. Manual market odds are withheld from the model. Research must return source citations or the job fails. The report does not claim independent fact-checking.

Jobs execute off the trading loop, persist progress, run one at a time, and never retry automatically. Restart marks interrupted jobs failed. A forecast finishing after its deadline is rejected. Timeouts and provider errors are visible without exposing credentials. The optional live provider path is tested with mocked responses only until a key is configured; check a small real research job after enablement. No historical replay is offered: today's news and model knowledge cannot safely recreate a past information cutoff.

Storage uses separate `intelligence` and `intelligence_usage` tables in the existing SQLite database and is included in its backups. Limits: 500 questions, 100 forecasts per question, 10 AI jobs per UTC day by default (configurable up to 100). No automatic research schedule or paid call occurs merely by loading a page or deploying.

Integration references: [Responses web search](https://developers.openai.com/api/docs/guides/tools-web-search) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Automatic strategy selection

This is a deterministic statistical researcher, not an LLM or a guarantee of profit. Every six hours, six bounded candidates are evaluated on the first 70% of up to 2,160 archived hourly candles. At least 600 continuous candles are required. All candidates use the same 100-candle warmup, risk limits, fees and slippage. Training requires three completed round trips, positive return above a same-allocation buy-and-hold benchmark, no daily halt and at most 2% sampled drawdown. Rank eligible candidates by net return minus drawdown. Only that winner is checked on the later 30%, starting flat with previous candles used only for indicator warmup. Require two closed trades and the same return/drawdown gates. There is no runner-up selection on holdout failure. Otherwise hold cash.

Research continues while paused. Every report (last 30) is retained in account state; hourly candles accumulate in SQLite. Rolling holdouts overlap and are reused across assessments, so this is not independent proof of a trading edge. The short initial history is especially weak evidence. Account history is never reset. Initial migration enables automatic hourly research and caps allocation at 10% and daily loss at 2%, preserving stricter existing limits and costs. Existing positions are closed at a fresh mark on resume before switching strategy. Pause/halt are never cleared by research. Assessments older than 12 hours cannot authorize new entries. Saving advanced settings explicitly disables automatic mode; re-enable only paused and flat. No paid API calls are made by automatic selection. The separate Intelligence workspace still needs a provider key for AI generation and does not control trades.
