# Vaada Design Spec v2 - Editorial Promise Cards

## Vision
Transform promises from functional data cards into **shareable visual statements**. Think magazine editorial meets crypto commitment.

---

## Current vs. New

### Current (v1)
```
┌─────────────────────────────────┐
│ TEST    ✓ SETTLED    10m   🧪  │
│                                 │
│ Quick Test                      │
│ Run 0.32 miles in 10 minutes    │
│                                 │
│ 0.32        $1                  │
│ MILES       MIN STAKE           │
│                                 │
│ Be the first to join   $0 pool  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │      Entry Closed           │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
- Data-heavy
- Functional
- Not shareable
- Generic

### New (v2)
```
┌─────────────────────────────────┐
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │   [HERO IMAGE]          │   │
│   │   Running silhouette    │   │
│   │   against sunrise       │   │
│   │                         │   │
│   │  ● shane      $25       │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│   "Run 10 miles this week"      │
│                                 │
│   ┌─────────────────────────┐   │
│   │     Stake Your Word     │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```
- Visual-first
- Editorial
- Highly shareable
- Personal

---

## Design Elements

### 1. Hero Image (Required)
**Options:**
- User uploads custom image
- Auto-selected from curated library based on goal type
- AI-generated based on promise text
- Default category images (running, cycling, reading, etc.)

**Specs:**
- Aspect ratio: 4:5 (portrait) or 1:1 (square)
- Min resolution: 800x1000px
- Style: Editorial, aspirational, motion-focused
- Overlay: Subtle gradient at bottom for text legibility

### 2. User Badge
**Position:** Bottom-left of image, overlaid
**Design:**
```
● username
```
- Colored dot (user's accent color or achievement-based)
- Lowercase username
- Semi-transparent pill background
- Font: Medium weight, small size

### 3. Stake Badge
**Position:** Bottom-right of image, overlaid
**Design:**
```
$25
```
- Bold, clean number
- Green accent (#2EE59D) for active
- Semi-transparent pill background

### 4. Promise Text
**Position:** Below image
**Design:**
- Quoted text: `"Run 10 miles this week"`
- Sentence case
- Larger font, medium weight
- Max 2 lines, truncate with ellipsis

### 5. CTA Button
**States:**
- `Stake Your Word` - joinable
- `Joined ✓` - user has joined
- `Verifying...` - post-deadline
- `Won 🎉` - success
- `Missed` - failure (muted)

---

## Card States

### Browse (Not Joined)
```
┌─────────────────────────────────┐
│   [HERO IMAGE]                  │
│                                 │
│   ● creator        $10-50      │
│                                 │
│   "Ship my app by Friday"       │
│                                 │
│   12 people · $340 pooled       │
│                                 │
│   ┌─────────────────────────┐   │
│   │     Stake Your Word     │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Active (Joined, In Progress)
```
┌─────────────────────────────────┐
│   [USER'S HERO IMAGE]           │
│                                 │
│   ● you            $25         │
│                                 │
│   "Run 10 miles this week"      │
│                                 │
│   ████████░░ 7.2 / 10 mi        │
│   3 days left                   │
│                                 │
└─────────────────────────────────┘
```

### Won (Shareable Proof)
```
┌─────────────────────────────────┐
│   [HERO IMAGE + GOLD BORDER]    │
│                                 │
│   ● shane     KEPT WORD 🏆     │
│                                 │
│   "Run 10 miles this week"      │
│                                 │
│   ✓ Verified · +$8 earned       │
│                                 │
│   ┌─────────────────────────┐   │
│   │     Share Proof →       │   │
│   └─────────────────────────┘   │
└─────────────────────────────────┘
```

### Lost
```
┌─────────────────────────────────┐
│   [HERO IMAGE - DESATURATED]    │
│                                 │
│   ● shane          missed      │
│                                 │
│   "Run 10 miles this week"      │
│                                 │
│   ✗ 6.2 / 10 mi · -$25          │
│                                 │
└─────────────────────────────────┘
```

---

## Share Card (Social Export)

When user clicks "Share Proof", generate optimized image:

```
┌─────────────────────────────────┐
│                                 │
│   [HERO IMAGE]                  │
│                                 │
│   ● shane                       │
│                                 │
│   "Run 10 miles this week"      │
│                                 │
│   ✓ Promise kept                │
│                                 │
│   ─────────────────────────     │
│   vaada.io · bet on yourself    │
│                                 │
└─────────────────────────────────┘
```

**Specs:**
- 1080x1350px (Instagram optimal)
- PNG export
- Subtle Vaada branding at bottom
- One-tap share to Stories, Twitter, etc.

---

## Image Library (MVP)

### Running
- Sunrise silhouette runner
- Trail running in nature
- Urban runner crossing street
- Treadmill focused shot

### Fitness
- Gym weights close-up
- Yoga pose outdoor
- Swimming lanes
- Cycling motion blur

### Productivity
- Laptop minimal workspace
- Notebook and coffee
- Code on screen
- Calendar/planning

### Habits
- Morning routine (coffee, sunrise)
- Meditation pose
- Book reading
- Healthy meal

---

## Color System

| Element | Color | Usage |
|---------|-------|-------|
| Primary | #2EE59D | CTA buttons, success states |
| Success | #2EE59D | Won badge, verified |
| Warning | #F59E0B | Time running out |
| Error | #EF4444 | Missed/lost |
| Muted | #9CA3AF | Inactive, past |
| Text | #111827 | Primary text |
| Secondary | #6B7280 | Captions, metadata |

---

## Typography

| Element | Size | Weight | Style |
|---------|------|--------|-------|
| Promise text | 18px | 500 | Quoted |
| Username | 12px | 500 | Lowercase |
| Stake amount | 14px | 700 | Currency |
| Metadata | 12px | 400 | Secondary color |
| CTA | 14px | 600 | Uppercase |

---

## Implementation Priority

### Phase 1 (MVP++)
- [ ] New card layout with image placeholder
- [ ] Default images by category
- [ ] Share card generation (static)

### Phase 2
- [ ] User image upload
- [ ] Progress bar for active promises
- [ ] Animated win state

### Phase 3
- [ ] AI image generation from promise text
- [ ] Social sharing integration
- [ ] NFT proof minting option

---

## References
- Inspiration: Editorial fashion cards, Cosmos app, Are.na
- Motion: Subtle parallax on scroll, card hover lift
- Feel: Premium, aspirational, personal

---

*"Make promises feel like statements, not transactions."*
