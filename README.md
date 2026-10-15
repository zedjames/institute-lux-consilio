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
