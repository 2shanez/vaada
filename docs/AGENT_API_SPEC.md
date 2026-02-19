# Agent API Spec

> **Status:** Planned (not yet built). Build when user demand or agent developer interest justifies it.

## Endpoints

| Endpoint | Method | Description | Effort |
|----------|--------|-------------|--------|
| `/api/agent/goals` | GET | List active goals (filterable by type, status) | 1hr |
| `/api/agent/goals/:id` | GET | Goal details + participants + verification status | 1hr |
| `/api/agent/join` | POST | Join a goal on behalf of a user/agent wallet | 3hr |
| `/api/agent/create` | POST | Create a new goal | 2hr |
| `/api/agent/verify/:goalId` | GET | Check verification status for a participant | 30min |
| `/api/agent/auth` | POST | API key validation / issuance | 2hr |
| Auth middleware | — | API key check on all `/api/agent/*` routes | 1hr |

## Agent Wallet Options

### Option A: Agent-held wallet (simpler, MVP)
- Agent holds its own USDC and stakes directly
- User transfers USDC to agent wallet beforehand
- ~2hr to set up wallet management

### Option B: Delegated approval (better UX, V2)
- User approves agent's wallet address to spend their USDC (`ERC-20 approve`)
- Agent calls `joinGoal` using user's funds
- Needs a frontend approval flow ("Authorize Agent")
- ~4hr (frontend + contract interaction)

## Supporting Pieces

| Item | Effort |
|------|--------|
| API key management (generate, revoke, dashboard) | 3hr |
| Rate limiting | 1hr |
| Docs page (`/docs/api`) | 2-3hr |
| TypeScript SDK (`vaada-sdk`) | 3-4hr (nice-to-have) |
| Webhook callbacks (goal settled, verified, etc.) | 3hr (nice-to-have) |

## Scope Estimates

| Scope | Time |
|-------|------|
| **MVP** (endpoints + auth + Option A) | ~12hr / 2 days |
| **Full** (+ Option B + docs + SDK + webhooks) | ~25-30hr / 1 week |

## Use Cases
- "Hey agent, stake $5 that I'll run 3 miles tomorrow" → agent creates + joins goal
- Agent monitors Fitbit/Strava and enters user into recurring challenges
- AI agents competing on behalf of users (accountability-as-a-service)
- Third-party apps building on Vaada as commitment rails

## Notes
- No contract changes needed — `joinGoal` doesn't care who signs the tx
- Existing admin endpoints (`create-goal`, `cancel-goal`) can be refactored into agent routes
- Existing verify endpoint is already agent-compatible

## Voice Interface (Future)

### Flow
1. User sends voice message (Telegram voice note, etc.)
2. Speech-to-text (Whisper API or similar)
3. Parse intent: goal type, amount, deadline, verification method
4. **Confirmation step** (mandatory for any money movement) — text back summary, user replies YES
5. Execute via agent API

### Example
> 🎤 "Stake five bucks that I'll run three miles tomorrow"
>
> 🤖 "Stake $5 on 3mi run, deadline tomorrow 11:59pm EST. Reply YES to confirm."
>
> ✅ "YES"
>
> 🤖 "Done. You're in. Go run. 🏃"

### Implementation
- Telegram voice notes → Whisper transcription → intent parsing → agent API
- No new app needed — works as an Alfred/bot feature
- ~1-2 days on top of agent API MVP
- Confirmation step is **non-negotiable** (voice input + money = must verify)

### Security Considerations
- Always require explicit text confirmation before moving funds
- Rate limit voice commands (prevent rapid-fire accidental stakes)
- Optional: require a PIN or passphrase for amounts over a threshold

## Trigger to Build
- 20+ active users, OR
- An agent developer/integration partner asks for it
