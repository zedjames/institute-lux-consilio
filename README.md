# Institute Lux Consilio

**Foundational Science & Discovery.**

Public website and canonical research-library metadata for Institute Lux Consilio.

The scholarly archive is organized by questions and research programs. It carries original DOI and historical publication provenance.

## Source of truth

Edit `assets/data/research.js` for program, publication, and note records, and update the matching export `research/catalog.json` in the same commit. Automated repository checks verify that these two representations agree and that records have unique identifiers.

The FFB website focuses on measurement technology and commercial applications. Membrane Health focuses on its app. Both link here for foundational research.

## Publishing

GitHub Pages deploys from `main`. The canonical site domain is `https://instituteluxconsilio.org/`, configured through the root `CNAME` file. `www.instituteluxconsilio.org` redirects to the apex once both DNS records are live. The original GitHub Pages project address is retained as the deployment origin.

## Scholarly publication pages and search discovery

Each audited catalog paper has a stable, directly crawlable `publication-<id>.html` page,
except the existing manually maintained full-text Health records `publication-hfd4.html`,
`publication-hfd5.html`, and `publication-hfd6.html`. Publication pages contain
DOI-linked citations, research summaries, series navigation, and PDF or external
DOI links without claiming that ILC owns or republished the original manuscripts.

Run `node scripts/build-publication-pages.mjs` after updating the paired
`research/catalog.json` and `assets/data/research.js` metadata. The generator
updates all derived publication HTML, `publications.html`'s pre-rendered archive,
and `sitemap.xml`. The verification command `node scripts/verify-site.mjs`
ensures the checked-in outputs match the canonical catalog. The daily Zenodo
version sync performs generation before verification and commits the outputs
atomically with new DOI/PDF information. Avoid hand-editing generated records.

Google Scholar handles discovery independently: these structured landing pages
and verified links improve crawlability but do not guarantee Scholar inclusion.

## External PDF links on new Zenodo versions

For historical records whose full-text PDF is still linked from FFB or another
external host, a newly published Zenodo version replaces that link with the
**checksum-verified PDF of the new Zenodo version**. The DOI, date, browser
catalog, permanent publication page, and archive links update together.
Already-mirrored local Health PDFs retain their existing manifest/checksum
verification path. This avoids a citation to a new paper version pointing
readers to an older externally hosted manuscript. The scheduled workflow
also supports manual dispatch in GitHub Actions when a same-day update is needed.

## Static research-program landing pages

Research-program pages other than the bespoke Health overview are now rendered
into HTML from the audited catalog. In particular, the Navier–Stokes page lists
all four published papers without waiting for JavaScript or a possibly stale
browser-cached `research.js`. Run `node scripts/build-program-pages.mjs` after
updating the catalog; the Zenodo workflow automatically runs it and stages
`research-*.html` with the paper-record changes. The repository validation
checks that every generated program page matches its source catalog.

## Standing Concordia institutional disclosure

The permanent public disclosure for the Institute's private Concordia scientific
research repository is `https://instituteluxconsilio.org/concordia/`.
The page is maintained at `concordia/index.html` (ILC-CRD-001; initial version
1.0, October 15, 2026). The canonical URL is permanent: future revisions
update the dated document and its revision history without changing this route.
The `scripts/build-publication-pages.mjs` sitemap generator includes the URL,
so daily Zenodo publication syncs cannot remove it. Manuscript-specific Lean,
mathlib, source-commit, and declaration provenance belongs in each publication,
not in the institution-wide disclosure.

## Crawlable homepage and research discovery

The homepage and research overview include catalog-derived static program indexes,
so all series are visible even when the browser holds older research assets or
JavaScript cannot execute. The homepage also pre-renders the four most recent
papers. Run `node scripts/build-site-discovery.mjs` after catalog changes; the
Zenodo workflow runs the same generator, and site verification rejects stale
published navigation. The shared browser script leaves these generated lists
untouched while continuing to handle interactive publication filters and other
non-static sections.

## Static-first publishing invariant

Important public content (homepage, Research programs/questions/themes, publication
index, series pages and paper records) must be present in delivered HTML without
JavaScript. Browser scripts can enhance search and navigation but cannot replace
scientific listings with cached catalog data. Search filters hide/show existing
HTML cards; full-text links and citation identities remain server-published.
CI enforces output consistency with the canonical research catalog, and the
Zenodo sync regenerates all derived HTML. New programs or papers must pass
static-content verification before deployment. This avoids the recurring
stale-browser-JavaScript disappearance of recently published research.

## DOI-family validation and partial progress

Kinetic Paper I is published as version DOI `10.5281/zenodo.23405912`
under concept DOI `10.5281/zenodo.23405911`. The earlier two IDs
had been reversed in the catalog and prevented every Zenodo sync run.
Use `python3 scripts/audit-zenodo-families.py` for read-only Zenodo
metadata inspection. On scheduled or push runs, a failed publication family
is quarantined while other independently checksum-verified updates proceed.
The Action reports failure after committing any valid changes, never claiming
that a skipped manuscript was successfully updated. PR preflights stay strict.
Each paper's displayed version is derived from published Zenodo metadata
when that field is present, not from filename guesses.

## Concordia institutional research environment

The canonical Concordia institutional disclosure remains `/concordia/` and
identifies ILC-CRD-001. It links to the dated source inventory at
`/concordia/inventory/` and the governed research Runtime explanation at
`/concordia/runtime/`. Both are static HTML and indexable without JavaScript.

The public inventory source is the sanitized snapshot metadata JSON at
`concordia/inventory/snapshots.json`. The private 2026-10-17 Markdown source
record was not copied into the public repository. Its Git source pin, user-
supplied SHA-256 and scoped lexical totals are published without suggesting
that a full Lean build was run. Update the inventory page, formal-program
metrics and snapshot JSON together; the integrity checker asserts the exact
current snapshot figures. Future reports may extend historical snapshots.

## Institutional AI and research continuity disclosure

The Institute's standing AI interpretation and scientific research continuity policy
is published at `/ai-scientific-continuity.html` (ILC-AI-001, v1.0,
October 20, 2026). It is independently readable, with document control,
canonical URL, revision history, and structured metadata. It is linked from
Governance, Methods, Concordia overview, and Concordia Runtime. It governs the
evidentiary distinction between AI interpretations and established research and
affirms human scientific accountability. Its publication-specific AI-use
disclosure commitment applies prospectively; existing papers retain their
own actual disclosure histories.

Preserve the canonical URL across future revisions, include the route in
`scripts/build-publication-pages.mjs` and the generated sitemap, and keep the
shared header navigation classified under About in
`scripts/build-main-navigation.mjs`. Site verification pins the
standing document and its entry points.

## Concordia updates and beta interest (Buttondown)

Concordia overview and Runtime include one static HTML Buttondown signup
form each, posting directly to `https://buttondown.com/api/emails/embed-subscribe/institute-lux-consilio`.
The form works without JavaScript and sends no subscriber data to the GitHub
Pages repository. The optional checkbox submits the `sub_tag_1wmcktkxm58d2sdeaj4z1cfvkf`
tag, so newsletter updates can remain distinct from a request to be considered
for the planned closed beta. **Buttondown tagging requires a plan with tags
(Basic or above)**; activate/verify the feature in Buttondown before relying
on segmented beta-interest subscriptions. Do not advertise beta admission as
automatic. The hosted newsletter URL is
`https://buttondown.com/institute-lux-consilio` and is linked as fallback.

Runtime status copy is Alpha Testing with a **target**, not guarantee, of an
invitation-only closed beta in Q2 2027. Changing the schedule means updating
both forms, the Runtime status line and the Collaboration reference together;
`scripts/verify-site.mjs` guards the shared assertions.
The beta-interest tag ID is pinned to the existing Buttondown tag, not its potentially changing display name. An embedded `name=tag` checkbox sends that ID only when opted in; ensure the created tag is the intended beta-interest tag before publishing.

## Canonical institutional navigation

The primary header is authored once by `scripts/build-main-navigation.mjs`:
**Research · Publications · Concordia · Methods · About · Collaborate**.
This is pre-rendered HTML rather than dynamically injected browser JavaScript.
Run `node scripts/build-main-navigation.mjs` after adding a new public page;
publication records also import this renderer in their static page generator.
The Zenodo regeneration workflow runs the canonical navigation builder after
all other page generators, and the scholarly integrity check asserts identical
navigation and correct `aria-current` state on every published HTML page,
including all three nested Concordia routes. The historical unpublished
preview file is intentionally excluded. The six-link header collapses to the
existing accessible menu on smaller screens.
