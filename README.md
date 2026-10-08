# Institute Lux Consilio

**Foundational Science & Discovery.**

Public website and canonical research-library metadata for Institute Lux Consilio.

The scholarly archive is organized by questions and research programs. It carries original DOI and historical publication provenance.

## Source of truth

Edit `assets/data/research.js` for program, publication, and note records, and update the matching export `research/catalog.json` in the same commit. Automated repository checks verify that these two representations agree and that records have unique identifiers.

The FFB website focuses on measurement technology and commercial applications. Membrane Health focuses on its app. Both link here for foundational research.

## Publishing

GitHub Pages deploys from `main`. The canonical site domain is `https://instituteluxconsilio.org/`, configured through the root `CNAME` file. `www.instituteluxconsilio.org` redirects to the apex once both DNS records are live. The original GitHub Pages project address is retained as the deployment origin.
