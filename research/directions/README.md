# ILC Living Research Atlas — RDA-01

This directory is a **public-summary research register**, not a mirror of the private Concordia repository. Register scientific directions under stable IDs (`QG-D01`, `CH-D01`, etc.) using one JSON file per direction; list its identity in `index.json`. The JSON Schema documents the shape; `scripts/build-research-directions.mjs` also validates semantics across the public catalog.

## Scientific integrity and disclosure

- Only material approved for public description belongs in this public repository. **Never paste internal Lean sources, private artifact contents, confidential contributions, unpublished manuscript text or private source paths into a withheld JSON record.**
- `disclosure: "public_summary"` permits a *scoped scientific summary* to appear on the site; it is not authorization to publish underlying formal files. `withheld` is excluded by the renderer but should still contain no private information.
- `evidence: "published"` requires a real `publication_id` from the canonical catalog. Internal formal work uses `formal_internal`, with an explicit `scope` and no publication ID. Proposals use `hypothesis`, and unverified developing material uses `research_in_progress`.
- The evidence class, publication standing, access arrangement and disclosure state are **independent**. Do not infer physical validity, experimental implementation or public proof replay from a formal theorem.
- Every direction must state its scientific limitations, open obligations, and date-stamped history. Preserve initial history; append new dated events for changes, including corrected claims and new obstructions.
- Cross-direction relationships identify intellectual or mathematical connections. A relationship is not itself a theorem of formal compatibility; prove that bridge separately where necessary.
- `program_ids` connects the public view to existing site programs. CH-D01 is an **adjacent CH scattering stream** associated with the celestial research page, not a claim that the programs are identical.

## Weekly maintenance

1. Identify a meaningful new finding, open question or obstruction; decide whether it updates an existing direction.
2. Confirm the supporting source and precise theorem domain, then record a scoped claim or obligation. Update the existing JSON file; append a dated `history` entry.
3. Determine the permissible public summary independently from private Concordia access.
4. Run `node scripts/build-site-discovery.mjs`, `node scripts/build-program-pages.mjs` and `node scripts/verify-site.mjs`.
5. Review generated Research and program views in a pull request. Merge only after editorial approval and checks.

The overview replaces generic theme cards rather than increasing page density. The publication catalog and Inquiry Explorer retain their own source-specific authority; future integration can use these IDs without duplicating scientific descriptions.

## Future compatibility

RDA-01 establishes stable identities, claims, relationships, obstructions, and dated events. RDA-02 can extend revision/provenance tooling; RDA-03 can add a fully navigable relationship atlas; RDA-04 can connect approved claims to authored Inquiry Explorers and governed Runtime access. These extensions do not require altering existing direction IDs.
