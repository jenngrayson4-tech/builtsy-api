# Builtsy — Master Plan
Last updated: April 14, 2026

---

## The Vision (Long Game)

Builtsy is a prompt-to-product engine that becomes a Blueprint marketplace.
Phase 1: Jennifer builds the Blueprints.
Phase 2: The community uses and shares them.
Phase 3: The community builds them. Builtsy becomes the Canva of AI-built products.

---

## Current Platform Status (April 2026)

**Live at:** aiomasterclass.netlify.app (password: builtsy-beta-2026)
**Domain purchased:** builtsy.ai — DNS not yet connected to Netlify
**Auth:** Shared password via sessionStorage (builtsy-auth)
**Storage:** localStorage for Blueprint saves and progress tracking

### What's built and deployed:
- 4 Builtsy Basics (replaced 6 old modules) — basics1-4.html
- 13 Blueprints including Site Upgrade (Tweak / Transform / Rebuiltsy)
- Builtsy Site Audit Tool — 12-phase audit, 3-proxy fallback, live URL scan
- Dashboard — 4 Basics cards, audit tool in nav, progress tracking
- About page — Jennifer + Grayson origin story with photo
- Build Bible — embedded in all 13 Blueprint prompts on copy
- Hamburger nav — mobile-responsive across all platform files

### Known pending items:
- [ ] Connect builtsy.ai DNS to Netlify
- [ ] Update sitemap.xml URLs from promptpublishgetpaid.com → builtsy.ai after DNS switch
- [ ] Compress jennifer.jpg (828KB → WebP under 200KB) via squoosh.app
- [ ] Add portfolio section to risewebstudio.com (Grayson's site)
- [ ] before/after visual for Tweak/Transform/Rebuiltsy on Site Upgrade BP
- [ ] Tweak/Transform/Rebuiltsy mode selector for all other Blueprints (deferred)
- [ ] In-platform Blueprint mockup preview (deferred — later feature)

---

## Phase 1 — Beta Launch (Now)

**Who:** Warm audience via Bunmi's Facebook group + Jennifer's network
**Price:** Free for beta users
**Goal:** 50-200 real users, real feedback, real builds
**Access:** Shared password (builtsy-beta-2026) via beta.html signup form
**What they get:** Full access to all 13 Builtsy Blueprints + Basics + Audit Tool

**Status:** READY TO SEND
- [ ] Bunmi's Facebook group post — drafted, waiting on Bunmi
- [ ] Beta signup page live at aiomasterclass.netlify.app/beta.html
- [ ] Password: builtsy-beta-2026

---

## Phase 2 — Paid Launch

**Trigger:** Brother's social post (millions of fans)
**This cannot happen until the following are built:**

### Must-haves before brother posts:
- [ ] Real user accounts (Supabase auth — not shared password)
- [ ] Payment working (Payhip — $47 launch price)
- [ ] Automated access delivery after payment
- [ ] Photo upload (Supabase Storage — users upload once, used everywhere)
- [ ] Email onboarding sequence (Kit — welcome, tips, first build)
- [ ] Affiliate program live (Payhip built-in, 20% commission)
- [ ] builtsy.ai DNS connected and live
- [ ] sitemap.xml updated to builtsy.ai URLs

### Pricing at launch:
- Launch price: $47 one-time (brother's audience gets this)
- Regular price: $67 one-time (after launch window)
- Pro tier: $97 one-time (extras, early Blueprint access)
- Free tier: 2 Blueprints forever free (drives signups)

### Cost breakdown at launch:
- Payhip free plan: 5% per sale ($2.35 on $47) — upgrade to $29/mo when volume justifies
- Supabase: $0 (free tier covers 50,000 users, 1GB storage)
- Kit email: $0 (free up to 10,000 subscribers)
- Netlify: $0 (static sites scale infinitely on free tier)
- Total monthly cost at launch: $0

---

## Phase 2 — Infrastructure to Build

### 0. Onboarding rewrite (do with Supabase)
**What it is:** The welcome/beta page onboarding questions are still geared toward the old "Prompt. Publish. Get Paid." course/client model. Needs a full rewrite to reflect Builtsy's 3-lane framing: build for yourself, build for your business, build for clients.
**When:** Build alongside Supabase auth — the onboarding experience will be rebuilt from scratch when real accounts exist anyway. The current shared-password flow makes it hard to test.
**Goal:** Questions should help users identify which lane they're starting in, set expectations correctly, and route them to the right first Blueprint.

### 1. Supabase Setup
**What it does:** User accounts, photo storage, saved projects
**Cost:** Free
**Complexity:** Medium — 1-2 build sessions with Claude
**Replaces:** Shared password + localStorage + Google Forms

Tables needed:
- users (id, email, created_at, plan)
- profiles (user_id, name, photo_url, bio)
- projects (user_id, blueprint_id, name, data, updated_at)

### 2. Payhip Setup
**What it does:** Payments, access delivery, affiliate tracking
**Cost:** Free (5% per sale) or $29/month (0% fees)
**Complexity:** Low — 30 minutes
**Flow:** User pays → Payhip delivers access email → user logs in

### 3. Kit (ConvertKit) Setup
**What it does:** Email capture, onboarding, launch sequences
**Cost:** Free up to 10,000 subscribers
**Complexity:** Low — 1 hour
**Sequences to build:**
  - Welcome email (immediate after signup)
  - Day 2: How to use your first Blueprint
  - Day 5: What others are building
  - Day 14: Invite to share + affiliate program

### 4. Photo Upload
**What it does:** Users upload profile photo once, used in all Blueprints
**Cost:** Included in Supabase free tier
**Complexity:** Medium — requires Supabase Storage integration
**Impact:** Removes the "attach photo to Claude" workaround entirely

---

## Priority Build List

These are the next things to build, in order of priority.

### Immediate (before beta launch)
- [ ] **Connect builtsy.ai to Netlify** — Site Settings → Domain Management → add builtsy.ai → update DNS at registrar. Takes 15 min + up to 48hr propagation.
- [ ] **Update sitemap.xml** — once builtsy.ai is live, find-and-replace all `promptpublishgetpaid.com` URLs with `builtsy.ai`. 5-minute job.
- [ ] **Compress jennifer.jpg** — squoosh.app → WebP → quality 82% → target under 200KB. Currently 828KB.
- [ ] **Test audit tool on live site** — paste a real URL and confirm the 3-proxy fallback is working correctly after deploy

### Short term (beta feedback window)
- [ ] **Before/after visual** for Tweak/Transform/Rebuiltsy on Site Upgrade Blueprint — static illustrations showing what each level produces
- [ ] **Purgatory Cellars Winery** — Grayson's first paid client, purgatorycellarscolorado.com — use Site Upgrade Blueprint (Rebuiltsy mode)
- [ ] **Rise Web Studio portfolio section** — add to risewebstudio.com — Parker Plumbing mockup + LANERA (planned) + Purgatory Cellars
- [ ] **Dashboard search bar** — may need redeploy, verify it's working

### Phase 2 infrastructure (before brother posts)
- [ ] Supabase auth — replace shared password with real accounts
- [ ] Payhip payment — $47 launch price, instant access delivery
- [ ] Kit email — welcome sequence, Day 2/5/14 onboarding
- [ ] Supabase photo storage — upload once, use everywhere
- [ ] Tweak/Transform/Rebuiltsy in every Blueprint (architecture change — big session)

### Later / deferred
- [ ] In-platform Blueprint mockup preview
- [ ] Blueprint marketplace contributor program (Phase 3)
- [ ] Contributor dashboard + revenue share

---

## Phase 3 — Blueprint Marketplace (Post-Launch)

**What it is:** Community members build and submit their own Blueprints
**How it works:**
  - Contributor applies to become a Blueprint builder
  - Submits Blueprint for review
  - Jennifer/team approves and publishes
  - Contributor earns % of revenue when their Blueprint is used
  - Builtsy takes a platform cut

**Why this is the moat:**
  - Library grows without Jennifer building everything
  - Contributors are incentivized to promote their own Blueprints
  - Creates a community of invested builders
  - Same model that made Canva, Notion, and Figma massive

**Teaser copy for launch site:**
  "Want to build a Builtsy Blueprint? Contributor program coming soon.
  Join the waitlist." → email capture

**What needs to exist before marketplace launches:**
  - 500+ active users (proof of market)
  - Quality standard document for Blueprint submissions
  - Contributor agreement / legal terms
  - Review and approval workflow
  - Contributor dashboard showing earnings
  - Revenue share mechanism (Stripe Connect or similar)

---

## Launch Sequence (When Ready)

1. Supabase + Payhip + Kit all wired together and tested
2. Soft launch to beta users — they get grandfathered free access
3. Email beta users: "We're launching — here's your permanent free access + affiliate link"
4. Brother posts — link goes to builtsy.ai
5. New visitors hit the homepage, see $47 launch price, buy, get instant access
6. Affiliate program active — beta users earn 20% on referrals

---

## Domain
- **Purchased:** builtsy.ai ✓
- **DNS:** Not yet connected to Netlify — do this before beta launch
- **Current live URL:** aiomasterclass.netlify.app
- **Steps to connect:** Netlify → Site Settings → Domain Management → Add custom domain → builtsy.ai → copy DNS records → update at registrar → wait up to 48hr
- **After DNS live:** Update sitemap.xml (find/replace promptpublishgetpaid.com → builtsy.ai)

---

## What "Ready for Brother's Post" Looks Like

✓ builtsy.ai domain live and connected
✓ Real user accounts (Supabase)
✓ Payment at $47 working (Payhip)
✓ Instant access after payment
✓ Welcome email sends automatically (Kit)
✓ Affiliate links working (Payhip)
✓ Photo upload working (Supabase Storage)
✓ All 13 Blueprints polished and tested
✓ Homepage production-ready
✓ Mobile tested on real phones
✓ sitemap.xml pointing to builtsy.ai

---

## Ownership Messaging — Core Differentiator

This needs to be front and center everywhere. The core message:

**You own the files. You own the product. No lock-in. No monthly fees. No asking permission.**

- Builtsy generates real HTML files that live on your computer
- Deploy free on Netlify — drag, drop, live in seconds
- Free hosting, free SSL, ~$12/year for your own domain
- Edit anytime by coming back to Builtsy — the Blueprint remembers your build
- Builtsy is a tool, not a landlord

**Where this message needs to live:**
- ✅ Marketing site — ownership section added between Why Builtsy and Blueprint Library
- ✅ Meta description on index.html already says "No subscriptions. No lock-in."
- [ ] About page — add a line about ownership philosophy
- [ ] Basics 01 — reinforce in "what you'll build" section
- [ ] Dashboard welcome banner
- [ ] FAQ in the chat assistant

**Why it matters:** Squarespace, Wix, Webflow all charge $15-50/month forever and you can't take your site with you. Lovable and other AI builders are the same. Builtsy is the only system that gives you a truly portable, owned product. That's a massive differentiator that needs to be said loudly.

---

## Notes

- Greg not needed for any of Phase 2 infrastructure
- All tools (Supabase, Payhip, Kit) have no-code dashboards
- Claude can walk through every setup step
- Estimated time to Phase 2 ready: 2-3 weeks of focused build sessions
- Crowdsource marketplace is Phase 3 — plant the seed at launch, build it after
- Jennifer is the proof of concept. Builtsy was built using Builtsy.
