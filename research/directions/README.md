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

## RDA-03: Scientific relationships and source-qualified mathematical inheritance

A research direction owns its outgoing `relationships`. The register does not maintain a second independent relationship graph: `scripts/build-research-relationships.mjs` derives the public Atlas page from those canonical direction records.

Each relationship has an immutable sequential ID (`QG-D01-R0001`), an explicit target direction, a relationship kind, a precise summary, a scope statement, a declared evidence standing, and `basis_ids` pointing to the source direction's own claim, open obligation, or qualified obstruction. Relationship kinds describe how questions interact; they **do not themselves prove mathematical or physical compatibility**.

Supported scientific standing:
- `research_question`: an identified intellectual/scientific connection; no mathematical bridge is claimed.
- `proposed_bridge`: a proposed mathematical interface whose proof remains outstanding.
- `formal_internal_bridge`: available only when tied to a source-side formal claim; independently checking it remains subject to that source's access and actual proof scope.
- `published_bridge`: requires a source-side published claim linked to a real paper record. Publication does not certify empirical validity or unrestricted physical application.

RDA-03's four pilot connections all retain `research_question` standing. None asserts an established physical mathematical interface across QG, CH, EPC, and observation. Directed links are deliberate; `A → B` does not imply `B → A`, and no transitive mathematical inheritance is inferred from graph connectivity.

### Maintenance and editorial checks

1. Add a connection only after confirming the source-side research claim or obligation and declaring the target scientific question. Source files and unpublished confidential artifacts stay in Concordia; do not paste them into this public repository.
2. Allocate the next `-R000n` ID in the source direction. Identify the relationship's precise scope and one or more valid source-side `basis_ids`.
3. Append a dated `relationship` history event to the source direction using RDA-02, with `affects:["relationships"]`. An editorial review must assess whether the proposed relation has any proven mathematical or physical significance.
4. Run `node scripts/build-site-discovery.mjs`, `node scripts/build-program-pages.mjs`, `node scripts/build-research-relationships.mjs`, and `node scripts/verify-site.mjs`. Validate the generated public page, direction anchors, DOI provenance, and evidence qualifications.
5. Publish only after source-scope and public-disclosure approval. The public relationship page is an index for scientific inquiry, **not** an automatically inferred proof dependency graph.

The living public relationship atlas is at `research/atlas/`. It uses accessible source cards and deep links with no required browser JavaScript. An AI-mediated or graphical Concordia relationship explorer may later consume these approved identities but must still verify private source authority through its own governed mechanisms.

## RDA-04: Linking public research directions to curated inquiry

`inquiries` is an optional, source-owned list connecting an approved direction to an **already authored** scientific inquiry pathway. The RDA-04 pilot maps `QG-D02` to the QG Explorer's `history` and `identity` paths, and `EPC-D01` to its exploratory `scale` path. The QG observation-instrument direction (`QG-D01`) has **no authored instrument pathway yet**, and is intentionally not mapped to a different question.

Each mapping declares `path`, `label`, `scope`, and `basis_ids` pointing to public-direction claims, qualified obstructions, or open obligations. A mapping is a curated editorial correspondence, not a machine-proved mathematical equivalence. Its evidence level is determined from the underlying sources; conceptual paths remain explicitly hypothetical where appropriate.

The generator `node scripts/build-inquiry-bridge.mjs` produces two outputs from existing approved direction records:

- The source-provenance section inside the current QG Inquiry Explorer (static HTML readable without scripting).
- `research/atlas/inquiry-index.json`, a **read-only public-data index** describing the same mappings and evidence scopes for possible future authorized clients. This does not grant Concordia access, create a conversational AI service, implement Runtime, or publish private scientific sources.

The existing nine QG explanations remain authored prose. Visitors may deep-link to `?path=identity&depth=math#inquiry` or other validated paths; JavaScript displays the matching provenance and updates the URL after deliberate selection. Unsupported query values return to a defined authored default. The question-proposal form remains a user-controlled email draft, without website data collection or background transmission.

### Adding an inquiry mapping

1. Review the source research direction and the actual authored Inquiry Explorer; do not generate a new scientific response from an inferred relationship.
2. Add the approved `inquiries` entry to the relevant direction, with a statement of its actual scientific limits and existing `basis_ids`.
3. Append an RDA-02 `editorial_review` or `relationship` event with `affects:["inquiries"]`. Preserve all earlier history.
4. Regenerate pages using `build-site-discovery.mjs`, `build-program-pages.mjs`, and `build-inquiry-bridge.mjs`, then validate the site and `tests/test_inquiry_bridge.mjs`.
5. Review the public wording, claim authority, publication links, access boundaries, and exact inherited scientific assumptions before approving a PR.

The compiler now recognizes four authored QG paths: `history`, `identity`, `scale`, and `observation`. The fourth is a source-scoped public summary of QGCO-07 internal mathematical research, not a paper release, strict-locality claim or experimental measurement device. Additional pathways must receive separate editorial scientific review, formal/source qualification, a corresponding Atlas owner, and three authored depths before being included. The architecture does not provide a universal scientific chatbot or a live mathematical proof-check service.

## RDA-05: First full scientific update — QGCO observation instrument

The first real test of RDA-01 through RDA-04 updates **QG-D01** rather than creating a redundant research program. It introduces an additional source-scoped formal claim for the particular equal-Einstein-source, distinct-outcome observation witness; expands the research foundation and limitations; adds the open matched-frame transport obligation; and appends a dated `finding` history event. The `observation` Inquiry Explorer path has three authored levels (conceptual result, mathematical instrument, and open physical continuation).

The mathematical instrument is constructed on the original **fixed-background finite-bank Fock carrier** with a **proper spatial-circle test window** and bounded two-outcome effects. Conditional pure states require a positive-probability outcome. This is **not** strict AQFT localization, a laboratory device, a detector near a black hole, a general density-state instrument, or a measurement-induced self-consistent Einstein–scalar solution.

The original QGCO-07 internal research has no separate authorized public manuscript or Zenodo release. The approved-for-review Atlas content is a qualified **public scientific summary**; no internal Lean implementation files, confidential collaborator files or non-public theorem proofs are included. Subsequent publication, external source distribution, or cross-geometry physical measurement claims require independent authorization.

A future weekly change should modify this existing direction and append an event; scientific records, web overview, QG program frontier, public inquiry index and authored provenance must then be regenerated together. Do not copy manuscript source details into a new isolated page whenever a research result advances.

## Future compatibility

RDA-01 establishes stable identities, claims, relationships, obstructions, and dated events. RDA-02 provides revision and provenance tooling; RDA-03 supplies the qualified cross-direction relationship atlas; RDA-04 connects approved claims to authored Inquiry Explorers through public scoped metadata; governed Runtime access remains a future, independently qualified capability. These extensions do not require altering existing direction IDs.
