# ILC Living Research Atlas — RDA-01 / RDA-02

This directory is a **public-summary research register**, not a mirror of the private Concordia repository. Register scientific directions under stable IDs (`QG-D01`, `CH-D01`, etc.) using one JSON file per direction; list its identity in `index.json`. The JSON Schema documents the shape; `scripts/build-research-directions.mjs` also validates semantics across the public catalog.

## Scientific integrity and disclosure

- Only material approved for public description belongs in this public repository. **Never paste internal Lean sources, private artifact contents, confidential contributions, unpublished manuscript text or private source paths into a withheld JSON record.**
- `disclosure: "public_summary"` permits a *scoped scientific summary* to appear on the site; it is not authorization to publish underlying formal files. `withheld` is excluded by the renderer but should still contain no private information.
- `evidence: "published"` requires a real `publication_id` from the canonical catalog. Internal formal work uses `formal_internal`, with an explicit `scope` and no publication ID. Proposals use `hypothesis`, and unverified developing material uses `research_in_progress`.
- The evidence class, publication standing, access arrangement and disclosure state are **independent**. Do not infer physical validity, experimental implementation or public proof replay from a formal theorem.
- Every direction must state its scientific limitations, open obligations, and date-stamped history. Preserve initial history; append new dated events for changes, including corrected claims and new obstructions.
- Cross-direction relationships identify intellectual or mathematical connections. A relationship is not itself a theorem of formal compatibility; prove that bridge separately where necessary.
- `program_ids` connects the public view to existing site programs. CH-D01 is an **adjacent CH scattering stream** associated with the celestial research page, not a claim that the programs are identical.

## RDA-02: Append-only research history and editorial review

A direction's `history` is a dated sequence of scientific editorial events. The first event is its registration (`QG-D01-H0001`), and every later event receives an immutable sequential ID. A correction does **not** rewrite an earlier event: the correction is appended with its own scope and related scientific fields. Significant changes to the current record must be covered by new history entries.

Event types: `finding`, `obstruction`, `correction`, `question`, `publication`, `scope_change`, `relationship`, `editorial_review`, and `milestone`. `registered` is reserved for the first entry. Each subsequent event has:

- `id`: immutable identity within that direction, e.g. `CH-D01-H0002`.
- `date`: UTC calendar date in `YYYY-MM-DD` format; must not precede the last event.
- `event`: the type of development being recorded.
- `summary`: public-safe scientific/editorial explanation of what changed or why it matters.
- `affects`: top-level direction fields actually changed by the revision; can be empty for a history-only research milestone.

**The public register must not hold undisclosed source content even temporarily.** A withheld record is still a public repository file. Approval of the wording of a proposed public summary happens in the pull-request review, not through a status flag or automatic script.

### Weekly procedure

1. Examine the original research in Concordia and any relevant published manuscripts. Identify the exact theorem domain, limitations, changed hypotheses, and source availability.
2. Decide whether the update changes an existing direction or creates a new one. Revise the necessary scientific fields in its JSON record, without editing historical entries.
3. Append a dated event with explicit affected fields, for example:

   ```sh
   node scripts/record-research-update.mjs \
     --id CH-D01 --date 2026-11-19 --kind finding \
     --affects "foundation,limits,next" \
     --summary "An illustrative new result requires review of the physical-scattering boundary."
   ```

   The example is only an illustration; **do not record it as an actual scientific finding**.
4. Run `node scripts/build-site-discovery.mjs` and `node scripts/build-program-pages.mjs`. The rendered Research Atlas and program pages update from the single direction record.
5. With the base branch fetched locally, run `node scripts/review-research-directions.mjs --base-ref origin/main`. It produces a human-readable editorial packet and fails on rewritten history, missing events, incorrect affected-field declarations, deleted directions, or invalid references. Use `--dry-run` on the update command to inspect an event without saving it.
6. Run `node scripts/verify-site.mjs` and `node tests/test_research_history.mjs`. Submit a review branch/PR. GitHub CI reruns the research audit against `main` and verifies the generated public HTML. **Only an authorized human review and squash merge may approve a public change.**

### Correction and publication rules

- Correct a theorem-scope or source claim in its current record, then append a `correction` event naming `claims`, `limits`, or other fields changed. Preserve the previous event and the Git history.
- When an internal result becomes a published result, link the actual archived `publication_id`, update the current claim evidence, and append a `publication` event. A formal proof is not a publication.
- When a research relationship or obstruction is added, maintain the precise physical/mathematical qualifier and append the matching history event. Do not infer an admitted physical bridge from similar vocabulary.
- A review packet is an **aid to scientific editorial review**, not proof, peer review, source-access authorization, or automatic scientific certification.

### Design decision

RDA-02 maintains versioned scientific development histories **without introducing a public news feed**. The Atlas remains curated and concise. If historical timelines or weekly digests later provide value, they can be generated from approved events while preserving the same scientific identities and evidence boundaries.

## Future compatibility

RDA-01 establishes stable identities, claims, relationships, obstructions, and dated events. RDA-02 provides revision and provenance tooling; RDA-03 can add a fully navigable relationship atlas; RDA-04 can connect approved claims to authored Inquiry Explorers and governed Runtime access. These extensions do not require altering existing direction IDs.
