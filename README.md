# AIHI Learning Evidence Engine — Teacher Review Prototype

**Hackathon prototype source release — publication and MIT code licensing authorized by AIHI on 2026-11-05.**

This package reuses two existing implementations. It does not join them into an integrated product.

## Teacher workbench

The browser implementation and domain/server modules are copied byte-for-byte from deployed v12, source commit `f47441eac0f60e4762b452f2aa7d0ecf2c08e04c` (2026-11-04).

Run the unchanged browser UI locally:

```sh
cd teacher-workbench/public
python3 -m http.server 8766 --bind 127.0.0.1
```

Open http://127.0.0.1:8766. Manual editing, local rule simulation, comparison, approval and TXT export run locally. The static server has no Meta endpoints, so model actions are unavailable. This is an honest local editor, not a simulated live-model service.

Run the existing 114 Node tests (Node 22.13+ with node:sqlite):

```sh
cd teacher-workbench
node --test tests/*.mjs
```

`server/` contains the real fixed-fixture Meta integration, `drizzle/` the empty schema migrations, and `app/api/ai/` the original Cloudflare route adapters. All are source for inspection and offline tests. This candidate deliberately excludes the private hosting wrapper, identity configuration and production data; it is **not a turnkey clone of the private hosted service**. Backend tests mock the external provider and execute real SQLite SQL. Never claim they are new live provider calls.

The six fixed synthetic scenarios use Standard muse-spark-1.3. Arbitrary pasted/TXT content is not sent to Meta. The original pilot's pricing gate expires at 2026-11-05 02:00 UTC. Do not remove expiry, rotate campaign IDs, reseed ledgers or call a model to bypass the original authorization. New deployments require a reviewed budget, authentication and credential setup.

## WHYWHY local prototype (separate companion)

`whywhy-local/` is the existing 2026-11-04 v0.1 FastAPI/SQLite prototype. It records first thought, question, verification plan, revision and self-explanation, followed by teacher review/export/deletion. It is deterministic and contains no generative-model connection. It is not connected to the workbench.

```sh
cd whywhy-local
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
python3 -m uvicorn whywhy.app:app --host 127.0.0.1 --port 8765
```

Use only synthetic adult-operated demonstrations. It lacks production authentication, guardian consent and a complete child-safety system. Do not expose its unauthenticated API publicly or use real pupils' data.

## What was built during the hackathon

The workbench's source history dates from Oct 31 to Nov 4, 2026: immutable original/draft state, exact-version review/export, local lesson revision and comparison, bounded synthetic Meta integration, budget/error controls and the current UI. WHYWHY v0.1 was produced Nov 4. The broader education philosophy predates the event and is not claimed as new hackathon work.

The demo video is a 175.021-second v12 design-review recording. Its Meta section is explicitly saved earlier output, not a new generation in the v12 footage. The 13 later successful pilot calls and one earlier successful call were independently confirmed in production ledgers during this audit; this package includes selected synthetic result evidence, not the private database.

## Publication and rights

AIHI-authored code and documentation are licensed under MIT; see `LICENSE`. The AIHI logo and artwork in `teacher-workbench/public/assets/` are reserved brand/demo assets and are excluded from the MIT grant; see `ASSET_NOTICE.md`. Third-party dependencies, provider-generated example outputs and platform APIs retain their own applicable terms. No model weights are included.

Excluded: Git history, private AIHI plans, internal task files, API keys, environment files, hosting identity/configuration, database contents, session data, contact lists and pupil records. See `SOURCE_MANIFEST.json` for the exact copied source files and hashes.

## Demo and source bundle

- [175-second demo video](https://github.com/aihiyina/aihi-learning-evidence-engine/raw/refs/heads/main/AIHI_v12_PRIVATE_DESIGN_REVIEW_DRAFT_2m55s.mp4) (MP4 download; local editing and separately labelled saved Meta evidence).
- `AIHI_Public_Source_Candidate_20261105.zip` contains the same release source and license notices.

The original hosted workbench remains owner-private. This source release supports local editing and offline regression tests; it is not a public hosted Meta inference service. The historical synthetic pilot expires at 2026-11-05 11:00 KST. No school deployment or classroom outcome claim is made.
