# Void Hopper — Simulated Playtest Report

Six simulated user agents representing different age demographics played through the full game experience (menu → tutorial → gameplay → shop → progression → endgame). Each agent is modeled on established mobile gaming behavioral research for their age cohort.

---

## Agent 1: Mia (Age 8) — "The Impatient Explorer"

**Profile:** Third-grader, plays Roblox and simple mobile games on parents' iPad. Short attention span, relies on visual cues not text, taps everything rapidly. Wants instant gratification and bright colors.

### Session Summary
- Immediately started tapping the screen during the loading/menu
- Accidentally started a game on Hard difficulty (tapped the red pill thinking it was a button to press)
- Did NOT understand the tutorial — text too small, didn't read "drag to aim"
- Kept tapping instead of dragging — launched straight down repeatedly
- Died 4 times in under 10 seconds each before accidentally dragging and figuring it out
- Once she understood dragging, had fun bouncing but died to the void quickly
- Went to shop, loved the Rainbow Bird but had 0 coins — frustrated
- Didn't understand coin earning rate or how to save up

### Bugs Found
1. **Double-tap on difficulty starts game immediately** — no confirmation. A child tapping around the menu will accidentally start on Hard mode.
2. **Tutorial text has no visual "drag" arrow on the actual bird** — the animated hand is in the overlay but the connection to the bird isn't obvious for young users.
3. **No "undo" for accidental difficulty selection** — once you tap a difficulty pill it's selected; no way to know what you picked vs what starts the game.

### Feedback
- **"The purple thing died too fast! I didn't even do anything!"** — Void rises too quickly for a new player on Hard difficulty. There's no difficulty gate for first-time players.
- **"I want the rainbow one NOW"** — No way to preview skins without buying them. Shop frustration for younger demographics is high.
- **"What do the numbers mean?"** — Coin prices in shop mean nothing to someone who doesn't understand earning rate. Needs context like "about 5 games" to earn X.
- **"The words go off the side"** — Floating text popups still clip on smaller screens when near walls (edge case: text spawns at exact wall position before clamp applies on first frame).

### Recommendations
- Force Easy mode for first 3 games ever played
- Add a large animated arrow pointing at the bird during tutorial step 1
- Add "Try On" preview button in shop (free to see, pay to keep)
- Show "X games to earn this" estimate under shop prices

---

## Agent 2: Jake (Age 14) — "The Competitive Grinder"

**Profile:** Plays Geometry Dash, Subway Surfers, and competitive shooters. Cares about leaderboards, high scores, and flexing rare skins. Will grind efficiently. Notices every frame drop. Watches YouTube gameplay before downloading.

### Session Summary
- Skipped tutorial immediately (tapped to skip)
- Figured out mechanics in 2 attempts, started optimizing launch angles
- Reached 1,200m on 4th run (Medium difficulty)
- Switched to Hard immediately, found it "actually fun"
- Noticed streak system, started deliberately timing bounces for "PERFECT"
- Hit a 12x streak, triggered Rocket Burst — "that's sick"
- Reached 3,000m, died to a Cosmic Serpent he didn't see coming
- Went to shop, bought Blue Jay (100 coins) after 5 runs
- Completed 2 missions, noticed daily challenge
- Played 15 total games in first session

### Bugs Found
1. **Momentum streak counter overlaps with pause button on smaller phones** — at 12+ streak the number is large enough (26px) to touch the pause icon's hit area at `width - 16*ts` vs pause at `width - 50*ts`. On iPhone SE (width=375) they nearly overlap.
2. **Rocket Burst can clip through guardian if triggered just as guardian spawns** — invincibility from burst + upward force bypasses guardian collision for ~0.2s overlap window.
3. **Combo timer resets to 0 on shield break even if combo was at 14x** — feels punishing when shield is supposed to be protective. Should maybe only reduce combo by half.
4. **Game over screen "Restart" button has 500ms delay** — feels unresponsive for a player who wants to instantly retry. Competitive players spam-tap restart area.

### Feedback
- **"Leaderboard is pointless without friends"** — Needs friend leaderboards or at least "beat your local best" more prominently shown.
- **"Why can't I see what upgrade does before buying?"** — Upgrade descriptions are visible but the actual multiplier values (1.06x, 1.12x etc) aren't shown. Hard to tell if Launch Power Lv2 is worth 120 coins.
- **"The void is too forgiving on Medium"** — After 5000m the void feels like it never catches up. Wants more endgame pressure.
- **"Perfect bounce window is too generous"** — At 0.35-0.5 seconds, a skilled player gets perfect on almost every bounce. Should narrow at higher streaks.
- **"No way to show off my 3000m run"** — Wants screenshot/share button on game over screen.

### Recommendations
- Add precise upgrade values to shop (show "1.12x → 1.18x" on next level)
- Tighten perfect bounce window at high streaks (0.35s → 0.2s after 8+ streak)
- Add share button to game over screen (canvas screenshot)
- Reduce restart button delay to 200ms
- Add a "Records" panel showing all personal bests

---

## Agent 3: Sarah (Age 22) — "The Casual Commuter"

**Profile:** Plays mobile games on her train commute (15-20 min sessions). Likes aesthetics, casual progression, doesn't want to think too hard. Plays Candy Crush, Alto's Odyssey. Values satisfying animations and chill vibes. Gets motion sick from intense screen shake.

### Session Summary
- Appreciated the glass-morphism UI aesthetic
- Completed tutorial, found dragging intuitive
- Played on Easy, reached 800m first run
- Liked the mood system visual feedback
- Got overwhelmed by all the HUD elements (score, coins, mood bar, combo, streak, difficulty badge)
- Screen shake at intensity 9+ made her uncomfortable
- Checked shop, bought Ember trail (50 coins) — "cute"
- Played 4 games, put phone down after train stop
- Came back next day, didn't notice daily login reward at first

### Bugs Found
1. **Reduced motion setting doesn't fully suppress all shake** — The `reducedMotionRef` check nulls shakeIntensity but the combo pulse (`comboScale = 1 + Math.sin(Date.now()/80) * 0.08`) still oscillates. Should respect reduced motion preference.
2. **Daily login popup doesn't appear until you scroll down in the menu** — easy to miss entirely if you just tap Play. Should be a modal overlay on first menu load each day.
3. **Mood meter effect text ("Speed +10%", "Coins x1.5") is 8px font** — unreadable on phone at normal viewing distance. Decorative only at that size.
4. **Zone announcement text appears at top-right but overlaps with streak counter** — when both are visible simultaneously they fight for the same screen space.

### Feedback
- **"There's too much on screen"** — HUD has: distance, coins, mood bar, mood label, mood effect, combo count, combo timer bar, combo multiplier label, streak number, streak label, difficulty badge, level badge, zone announcement, power-up indicators. That's 14+ HUD elements simultaneously.
- **"I don't understand what half these things do"** — Momentum streak, mood tiers, combo vs streak (different things?) — too many overlapping progression meters for a casual player.
- **"The screen shaking gives me a headache"** — Even with intensity 6 (boss spawn), it's noticeable.
- **"I want to just play and not think"** — Would prefer a "zen mode" without void pressure.
- **"The daily reward thing — I only found it after scrolling"** — Missed it for first 2 days.

### Recommendations
- Add a "Minimal HUD" option that hides streak, mood effects text, and zone announcements
- Make daily login reward a dismissible modal popup before the menu loads
- Respect reduced motion for ALL oscillating elements (combo pulse, aura pulse, etc.)
- Consider a "Zen Mode" option (no void, no score, just relaxing bouncing)
- Reduce default shake intensity by 40% across the board

---

## Agent 4: Marcus (Age 35) — "The Nostalgic Dad"

**Profile:** Plays games on his phone while kids are asleep. Remembers Flappy Bird and Doodle Jump fondly. Values fair monetization. Suspicious of anything that looks like a pay-to-win mechanic. Has limited playtime (10 min sessions). Notices UX issues from a product design background.

### Session Summary
- Appreciated no ads on first play (noted banner ad space exists)
- Played tutorial fully, understood mechanics quickly
- Medium difficulty, reached 600m first run
- Died to a spike he "swear wasn't there" — landing on wall near a spike
- Checked shop, noticed prices scale up quickly
- Did math: "1600 coins for Fire Eagle? At ~30 coins per run that's 50+ games"
- Appreciated that skins have abilities but questioned balance
- Played 3 runs, switched to Easy to relax
- Noticed missions, appreciated the small goals

### Bugs Found
1. **Spike near-miss detection fires AFTER player is already stuck to wall** — the "RISKY!" popup appears but the spike collision check also runs, creating a race condition where you can simultaneously get "RISKY!" text AND die on the same frame if the `dy` threshold overlaps with collision radius.
2. **Upgrade purchase has no confirmation dialog** — accidentally bought Coin Magnet Lv1 (40 coins) by tapping too fast in the shop. No "Are you sure?" prompt.
3. **Settings button is hard to find** — it's part of a row with Shop but visually subordinate. Took 3 menu visits to find it.
4. **Backup/Restore buttons look like they do the same thing** — no explanation of what they do or why you'd need them.

### Feedback
- **"Is this pay-to-win?"** — Storm Falcon skin gives 15% smaller hitbox. Combined with Ghost Bird's 12% reduction, that's a significant gameplay advantage locked behind 2000 coins. Casual players will hit a skill ceiling that paying/grinding players bypass.
- **"The void feels arbitrary"** — Died at 1500m when the void "caught up" during a guardian fight. No visual warning that the void was close until the red pulsing was already too late.
- **"I can't tell which difficulty my high score was on"** — Game over screen shows a generic "Best" but doesn't always make it clear which difficulty it's referencing.
- **"The charging mechanic is confusing"** — Didn't realize holding on the wall charges a stronger launch. No visual indicator until you already know to look for it.
- **"30 coins per run means 50+ runs for one premium skin"** — The grind feels excessive for a parent with limited time. Would pay $1.99 for a skin pack.

### Recommendations
- Add purchase confirmation for anything over 50 coins
- Add a "Void Distance" indicator in HUD (e.g., small meter showing how far below)
- Make charge ring more visually obvious (pulsing glow around bird while stuck)
- Consider a one-time IAP "Starter Pack" ($1.99 for 500 coins + 1 random premium skin)
- Label high scores clearly by difficulty on game over screen

---

## Agent 5: Linda (Age 52) — "The Reluctant Gamer"

**Profile:** Daughter showed her this game. Plays Wordle daily and occasionally Match-3 games. Not familiar with action game conventions. Slow deliberate taps, reads everything, gets confused by gaming jargon. Vision isn't perfect — needs larger text.

### Session Summary
- Spent 2 minutes on menu trying to understand what to tap
- Eventually found Play button (scrolled past difficulty pills without noticing they're selectable)
- Tutorial: read everything carefully but the animation moved too fast
- First attempt: dragged correctly but launched into a spike immediately
- Second attempt: made 3 bounces, confused by void rising, died at 150m
- Third attempt: reached 300m but didn't understand any of the floating text ("PERFECT!", "2x NICE")
- Never found the shop (didn't scroll down past the Play button)
- Played 5 games total over 20 minutes, best was 450m on Easy

### Bugs Found
1. **Menu scroll doesn't indicate scrollability** — no scroll indicator, shadow, or "swipe down for more" hint. The Play button appears near the bottom of the first screen, so users don't know there's more below.
2. **"COMBO" / "STREAK" / "MOOD" are gaming jargon** — no tooltips or first-time explanations for any of these systems. An older non-gamer has no idea what "5x NICE" means.
3. **Touch target for difficulty pills is too small** — the pill buttons are visually compact. On first visit, they look decorative, not interactive. No affordance (shadow, depth, press state).
4. **Game over screen auto-scrolls stats but "Restart" requires scrolling up** — on smaller screens the stats push Restart button below the fold.

### Feedback
- **"I don't know what any of these colored bars mean"** — The mood meter, combo bar, and streak number are all visual noise to her. No context for what they do or why she should care.
- **"The words pop up too fast and disappear"** — Floating text has 0.5-1.5s lifetime. For someone not trained to scan mid-game popups, they're missed entirely.
- **"Why did I die? What's the purple thing at the bottom?"** — The void storm needs a much more obvious first-time introduction. The tutorial mentions it but the in-game visual is subtle until it's too close.
- **"Everything is too small"** — On iPhone 14 (standard), the 10px mood effect text and 12px floating text descriptions are hard to read.
- **"I accidentally bought something"** — Scrolled in shop and a coin animation played. Wasn't sure if she spent coins or just previewed.

### Recommendations
- Add scroll indicator (bouncing chevron) below the Play button
- Increase minimum font size for all game text to 14px (logical)
- Add a "What is this?" tap-and-hold tooltip system for HUD elements
- Make void introduction more dramatic (full-screen warning flash + "THE VOID IS RISING" on first appearance)
- Add "tap to learn more" on first appearance of combo/mood/streak
- Make difficulty pills look like actual buttons (3D effect, shadow, larger hit area)

---

## Agent 6: Robert (Age 68) — "The Tablet Grandpa"

**Profile:** Plays on iPad (larger screen). Has arthritis — imprecise touches, slower reaction time. Plays chess and sudoku apps. Grandson installed this for him. Needs high contrast, large targets, and forgiving timing. Will give up permanently if first 3 minutes aren't positive.

### Session Summary
- Launched on iPad (screen width ~1024px, ts factor = 2.0)
- Menu looked good on iPad, text readable
- Found Play button easily, started on Easy
- Tutorial: understood dragging concept but couldn't execute precisely — his drag kept slipping
- First 5 attempts: couldn't complete a single wall-to-wall bounce. Aim angle restriction (10-55 degrees) meant his imprecise drags kept clamping to the shallowest angle, launching nearly horizontal
- On 6th try, got 2 bounces but the void caught him at 100m
- Extremely frustrated — "this isn't for me"
- Wife convinced him to try once more — reached 200m, felt pride
- Never attempted Medium/Hard, never reached shop

### Bugs Found
1. **Aim angle clamping is too restrictive for imprecise input** — The 10-55 degree window means a shaky drag that goes slightly horizontal gets clamped to 10 degrees (nearly flat), launching the bird sideways into the void. A wider window (5-70 degrees) would be more forgiving.
2. **No aim assist or auto-aim option for accessibility** — Many games offer "assisted aiming" for motor-impaired players.
3. **iPad DPR 2x with ts=2.0 makes some button hit areas correct but the charge ring (line 4435) renders at the wrong visual scale** — the charge progress ring uses `state.player.chargeLevel` but doesn't apply `ts` to its radius, making it appear tiny on iPad.
4. **Touch-start → touch-end without move doesn't do anything** — A quick tap on the bird while stuck (common for imprecise users) does nothing and gives no feedback. Should show a brief "Drag to aim" hint.

### Feedback
- **"I can't aim where I want"** — The clamped angle range is too narrow for someone with imprecise motor control. Even young players might find the 10-55 degree constraint unintuitive.
- **"It goes too fast"** — Even on Easy, the void rises fast enough that someone taking 3-4 seconds per launch will fall behind within 30 seconds.
- **"I pressed the bird but nothing happened"** — Expects tap = action. The drag mechanic has no fallback for tap users.
- **"The pause button is too small"** — At 36x36 CSS pixels, it's within iOS HIG guidelines but feels small for arthritis.
- **"I'd play this if it was slower"** — Would enjoy the core mechanic at 0.5x speed with no void for the first 60 seconds.

### Recommendations
- Add "Accessibility" section in settings: aim assist, larger buttons, slower void (Easy+)
- Widen aim angle range to 5-70 degrees minimum
- Add tap-to-launch fallback: tapping the bird while stuck launches at a default 45-degree angle with base power
- Add a "Practice Mode" with no void for first 60 seconds on Easy
- Make pause button 50x50 minimum on iPad
- Consider a brief aim guide line that shows BEFORE dragging (ghost line at 45 degrees)

---

## Summary of All Bugs Found

| # | Severity | Bug | Found By |
|---|----------|-----|----------|
| 1 | Medium | Double-tap difficulty starts game without confirmation | Mia (8) |
| 2 | Low | Tutorial lacks visual arrow pointing at the bird | Mia (8) |
| 3 | Medium | Streak counter overlaps pause button on small phones (iPhone SE) | Jake (14) |
| 4 | Low | Rocket burst can clip through guardian on spawn overlap | Jake (14) |
| 5 | Medium | Combo resets to 0 on shield break (punishing for protective item) | Jake (14) |
| 6 | Low | Restart button 500ms delay feels laggy | Jake (14) |
| 7 | Medium | Reduced motion doesn't suppress combo pulse / aura animations | Sarah (22) |
| 8 | High | Daily login reward buried below scroll fold — most users miss it | Sarah (22) |
| 9 | Low | Mood effect text (8px) unreadable | Sarah (22) |
| 10 | Low | Zone announcement overlaps streak counter | Sarah (22) |
| 11 | Medium | Spike near-miss + collision can fire on same frame (race condition) | Marcus (35) |
| 12 | High | No purchase confirmation in shop | Marcus (35) |
| 13 | Medium | No scroll indicator on menu (content hidden below fold) | Linda (52) |
| 14 | Low | Gaming jargon (combo, streak, mood) unexplained for new users | Linda (52) |
| 15 | Low | Difficulty pills don't look interactive | Linda (52) |
| 16 | Medium | Aim angle 10-55 degrees too restrictive for imprecise input | Robert (68) |
| 17 | Low | No feedback on tap-without-drag while stuck | Robert (68) |
| 18 | Low | Charge ring doesn't scale with ts on iPad | Robert (68) |

## Priority Fixes (High Impact, Low Effort)

1. **Add purchase confirmation dialog** (prevents accidental spending)
2. **Daily login reward as modal popup** (everyone misses it currently)
3. **Widen aim angle to 5-70 degrees** (improves accessibility + feel)
4. **Add scroll indicator on menu** (users don't know content exists below)
5. **Reduce restart delay to 200ms** (competitive players frustrated)
6. **Respect reduced motion for all pulsing animations** (accessibility compliance)
