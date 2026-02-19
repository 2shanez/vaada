# Vaada Infrastructure Costs — Scaling Analysis

## Current Stack (Free Tier) — 0-500 Users

| Service | Plan | Limit | Monthly Cost |
|---------|------|-------|-------------|
| Privy (Auth + Wallets) | Developer | 500 MAU | $0 |
| Vercel (Hosting) | Hobby | Low traffic | $0 |
| Supabase (DB) | Free | 500MB DB, 1GB storage | $0 |
| Alchemy (RPC) | Free | 300M compute units/mo | $0 |
| Fitbit API | Free | Rate limited | $0 |
| Base (Gas) | N/A | ~$0.001/tx | ~$0 |
| Domain (vaada.io) | Annual | — | ~$2.50 |
| **Total** | | | **~$0/mo** |

---

## Growth Phase — 500-2,500 Users

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Privy | Core (500-2,499 MAU) | $299 |
| Vercel | Pro | $20 |
| Supabase | Pro | $25 |
| Alchemy | Growth | $0-49 |
| **Total** | | **~$350-400/mo** |

---

## Scale Phase — 2,500-10,000 Users

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Privy | Scale (2,500-9,999 MAU) | $499 |
| Vercel | Pro + usage | $20-50 |
| Supabase | Pro | $25 |
| Alchemy | Growth | $49-199 |
| **Total** | | **~$600-750/mo** |

---

## Key Takeaways

### 1. Privy is Your Biggest Cost
Privy jumps from $0 → $299/mo the moment you pass 500 MAU. This is your first real scaling wall.

### 2. Revenue vs. Infra at 500 Users
- 500 users × $5 stake = $2,500 TVL
- If 20% forfeit new user challenge = $500 treasury (one-time)
- Morpho yield on $2,500 TVL @ 4.9% APY = ~$10/mo
- **You need more revenue streams to cover $299/mo Privy at this stage**

### 3. Revenue Levers
- Higher stakes (move beyond $5)
- More frequent goals (daily/weekly recurring)
- Platform fee on winnings (e.g., 5% of loser pool)
- Premium features (custom goals, private groups)

### 4. Cost Reduction Options
- **Privy startup credits** — apply through their startup program, especially as a Base ecosystem project
- **Alternative auth** — Dynamic, Thirdweb Auth, or custom auth (saves $299/mo but costs dev time)
- **Self-host Supabase** — saves $25/mo but adds ops burden (not worth it early)

### 5. Break-Even Analysis

| Users | Monthly Forfeitures (20%) | Morpho Yield | Total Revenue | Infra Cost | Net |
|-------|--------------------------|-------------|---------------|-----------|-----|
| 100 | $100 (one-time) | ~$2 | ~$2/mo | $0 | +$2 |
| 500 | $500 (one-time) | ~$10 | ~$10/mo | $299 | -$289 |
| 1,000 | $1,000 (one-time) | ~$20 | ~$20/mo | $350 | -$330 |
| 5,000 | $5,000 (one-time) | ~$100 | ~$100/mo | $600 | -$500 |

**Note:** Forfeitures are one-time per user, not recurring. You need a recurring revenue model (fees, premium, or higher-stakes goals) to sustainably cover infra past 500 users.

---

## Recommendation

1. **0-500 users:** No cost. Focus on growth.
2. **At ~400 users:** Apply for Privy startup credits. Explore Base ecosystem grants.
3. **At 500 users:** Must have a revenue model beyond forfeitures. Consider 5% platform fee on goal payouts.
4. **At 2,500+ users:** If revenue is healthy, Privy Scale at $499/mo is fine. If not, evaluate alternatives.

---

*Generated: February 16, 2026*
