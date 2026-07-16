# ISSP Builder Roadmap

This file captures future ideas that are not scheduled yet. Treat items here as backlog notes, not implementation commitments.

## Near-Term Backlog

### SEO and discoverability

Goal: make ISSP Builder easy to find when people search for ISSP-related terms.

Potential work:

- Improve page metadata for terms like `ISSP`, `ISSP Builder`, `Information Systems Strategic Plan`, `DICT ISSP`, and `Philippines ISSP template`.
- Add/verify `robots.txt`, `sitemap.xml`, canonical URLs, Open Graph metadata, and Twitter/X card metadata.
- Add structured data for the app, likely `SoftwareApplication` and/or `WebApplication` JSON-LD.
- Strengthen public pages (`/`, `/about`, `/privacy`) with clear copy about what the tool does and who it serves.
- Add Search Console / analytics verification if appropriate, while keeping the product privacy-respecting.

Success signal:

- Searching for ISSP-related terms should eventually surface ISSP Builder prominently, ideally on the first page for relevant Philippine government ISSP queries.

### Carlos attribution and author discoverability

Goal: make the project properly attributable to Carlos Antonio Albornoz, including when people search his name.

Potential work:

- Make attribution consistent across the landing page, About page, metadata, Open Graph cards, and structured data.
- Add `Person` or author structured data where appropriate.
- Ensure the About page clearly says the tool was built by Carlos Antonio Albornoz.
- Consider a dedicated, tasteful project credit block with links to Carlos's preferred website/profile.
- Ensure search snippets do not imply the app is an official DICT or CSC service.

Success signal:

- Searching for Carlos's name can surface the ISSP Builder project as one of his public works.

### Non-intrusive attribution in exports

Goal: give proper credit without making the generated ISSP feel like an ad or unofficial template modification.

Potential work:

- Add a subtle attribution message after PDF export completes, not inside the official ISSP content unless carefully reviewed.
- Consider a dismissible post-export modal: "Your PDF is downloading. ISSP Builder was created by Carlos Antonio Albornoz."
- Keep any attribution separate from agency-submitted content to avoid interfering with official use.
- If adding attribution to the PDF itself, keep it very subtle and outside critical template sections, such as document metadata rather than visible body content.

Success signal:

- Users understand who built the tool, but the exported ISSP remains clean, professional, and agency-focused.

### Ad-free and hosting support message

Goal: communicate that the app is free, ad-free, and maintained on personal time, while giving users a dignified way to help.

Potential work:

- Add a short note on the About page: the tool is free, ad-free, local-first, and maintained on Carlos's free time.
- Mention that help with hosting costs, feedback, testimonials, or recognition is appreciated.
- Avoid ads, dark patterns, paywalls, or anything that makes the tool feel commercial.
- Consider a small "support this project" link, but keep it optional and low-pressure.

Success signal:

- Users know the site is not monetized with ads and that any support is voluntary.

### Recognition / CSC PRAISE / PAGASA research

Goal: create a tasteful request that agencies can use if they want to recognize the work formally.

Potential work:

- Research official Civil Service Commission guidance before writing final public copy.
- Confirm whether the right framing is CSC PRAISE, CSC Pagasa Award, or another recognition mechanism.
- Draft a short guide agencies can use when sending appreciation, testimonials, recommendation letters, or award nominations.
- Keep the ask optional and non-intrusive.

Research note:

- Initial automated fetch of the CSC PRAISE page was blocked with HTTP 403, so this needs manual verification against official CSC guidelines later.
- Working assumption to verify: PRAISE refers broadly to agency awards/incentives, while the CSC Pagasa Award may be one possible formal recognition path under the CSC Honor Awards Program.

Success signal:

- The app can respectfully say how agencies may recognize the work without overstating eligibility or using the wrong CSC award category.

## Deferred Platform Hardening

### Main branch protection and CI

Goal: protect `main` from accidental damage once the Git workflow feels more familiar.

Potential work:

- Block force pushes to `main`.
- Block deletion of `main`.
- Require pull requests before merging.
- Add GitHub Actions CI for type check, lint, and build.
- Require passing CI checks before PR merge.

Notes:

- Do not enable required status checks until CI exists.
- See `docs/git-workflow-notes.md` for the plain-English Git workflow explanation.
