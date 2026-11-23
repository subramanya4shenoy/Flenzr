# Offers

Campaigns now group multiple offers in the brand workspace. See [Campaigns and offers](CAMPAIGN-HIERARCHY.md) for the folder flow, existing-offer organisation and storage compatibility.

Offers reuse the campaign, application and shared collaboration records. Existing direct enquiries remain private direct Offers; they are not automatically published or converted into a multi-creator brief.

## Listing design

Brand and creator Offer lists share a ticket-style card: a stable, muted gradient on charcoal surfaces, bold brief title, niche, a perforated divider, and a separate stub for the total planned budget and application deadline. Brand cards show audience and lifecycle status, with secondary controls grouped under Manage Offer. Creator cards show application status and quick apply. Decorative reference stripes are not scannable codes. The dedicated Offer page keeps its existing document design. Desktop and 390px browser checks, navigation, TypeScript and focused lint pass.

Brand listing cards also show application-based interest: up to four recent applicant avatars, a total count and “+N more.” Missing photos use initials. Clicking the row opens that Offer’s applications. Invitations and page views do not increase interest. Applicant previews are fetched in one owner-scoped query for the list and are never populated on public campaign responses.

## Brand flow

1. Open **Campaigns** in the brand menu, open a campaign and choose **New Offer**. New drafts default to **Invitation only**; choose **Public** for an openly shareable brief.
2. Enter the brief, deliverables, niche, planned total budget and application closing date, then save and publish.
3. Open the dedicated Offer page and use **Share Offer**. Public links show a read-only brief before sign-in. Private links reveal no brief until the viewer signs in as the owning brand or an invited creator.
4. Choose **Manage** in the Offer's left navigation to change publication state or invite a creator by their Flenzr handle and an individual quote. Send that creator the share link. The form saves access; it does not send an external email.
5. Choose **Applicants** to see the applicant list beside the section menu. Select a creator to review their private pitch, quote and negotiation history, or choose **All applicants** for the current page. Counter the quote, decline it or select the creator at their proposed terms. Multiple creators can be selected independently; lists paginate at 20 applicants.
6. Start each selected creator’s collaboration. Both parties must accept the same proposal version before that application is shown as claimed. Existing delivery, review, proof and completion workflows then apply.

Pausing or closing an Offer stops new applications, selections and counters. Existing collaborations continue independently. The total budget describes the brief and does not impose a one-creator limit or automatically reserve funds. Payments are not live.

The brand Offer page uses **Overview**, **Manage** and **Applicants** as its second navigation level. Overview shows the full brief; Manage contains brand controls and invitations. Applicants collapses the section menu to icons on desktop and adds the creator selector. The selector and application details show each creator’s saved profile photo, with initials when missing or unavailable. Photos come from the participant-scoped application response, not the public brief. On narrow screens, sections appear in a horizontal menu with a scrollable applicant list above the content. The sidebar matches the collaboration menu dimensions and animates between expanded and icon-only states, respecting reduced-motion preferences. Offer identity is shown in page breadcrumbs rather than a separate sidebar heading. Breadcrumbs link Campaigns → parent campaign → offer → section → selected applicant. Section hashes restore on reload and browser Back/Forward. Creator and signed-out public Offer views retain their document layout.

## Creator flow

Open **Offers**, or follow a brand’s share link. Private Offers require a matching creator invitation. Apply with a private pitch and quote; respond to the brand’s counter or propose another quote. Accepting one’s own latest terms is prevented. Selection leads to a separate shared collaboration and mutual agreement.

## Access and persistence

- Public responses whitelist brief fields, with no applicant list, pitches, quotes, contact information or negotiation history.
- Creator workspaces return only that creator’s application. Brand application lists are paginated at 20 records.
- Private Offers are excluded from public discovery and uninvited creator opportunities; direct application attempts are also denied.
- Negotiation saves a history, current author and revision. Requests carry expected Offer/application revisions and a unique retry ID. Stale responses fail rather than overwrite newer terms; identical retries are safe.
- Refresh Offer reloads saved terms. No background external-provider scraping or analytics calls are introduced.
- Migration `0028_offers` adds visibility and application negotiation fields; existing campaigns default to public. It is applied to the configured database.

## Verification

2026-11-23 navigation check: TypeScript and focused ESLint passed. An isolated Next.js browser preview with sample API responses checked brand section isolation, individual applicant selection, counter/selection submissions, 21-applicant pagination, section reload and browser Back/Forward, creator-view preservation, and overflow at 1024px, 768px and 390px. Dark/light desktop and mobile layouts were inspected. This checks the navigation change; it does not replace database-backed workflow regression.

Automated tests cover private access/application denial, public field whitelisting, private drafts, multiple selections, counter history, retries, stale revisions, rejecting one’s own terms, paused Offers and collaboration quote handoff. Browser checks use isolated test accounts and a real cookie BFF/API/database: creator application, brand counter, creator acceptance, collaboration navigation, private invitation grant and outsider denial. The 390px layout has no horizontal overflow. Google sign-in return-path tests include the dedicated Offer route.

Validation: 565 backend tests passed (17 optional checks skipped in the default run), 154 web tests passed, TypeScript and focused ESLint passed. The explicit PostgreSQL race test also passed separately: competing counters produce one success and one conflict; simultaneous retries of an acceptance preserve a single revision and the agreed quote. Mutual agreement is tested before the claimed flag can become true.

## Quick manual check

1. As a brand, save and publish a private Offer, then open it and copy its link.
2. Open the link signed out or as an uninvited creator: the private brief must remain hidden.
3. Invite your test creator by Flenzr handle. As that creator, open the same link and apply with a quote.
4. As the brand, refresh the Offer and send a counter. As the creator, refresh and accept it.
5. Start the collaboration and confirm its quote matches the accepted counter. Agree on the proposal from both accounts, then refresh the Offer to see the claimed state.
6. Repeat with another creator on the same Offer; selection of the first creator must not close the Offer or replace either application.

Offer ticket previews use five complete SVG backgrounds recreated from the supplied references: Horizons, Neon Peak, Pastel Mesh, Black, and Iridescent Silk. Their composition, colors and fine grain live in `web/public/offer-patterns`, with no raster images embedded in the SVGs. Each artwork retains its palette in either workspace theme; light text is used on dark artwork and dark text on pastel artwork. The same artwork is fitted across the whole ticket header, without the earlier cream wash or extra noise layer.

`offerTicketPattern(id)` preserves the existing six stable assignment slots; `offerTicketArtwork` maps them onto the five replacement designs. Refreshing, editing or changing devices does not reshuffle an offer's design. Preserve the assignment order and hash algorithm when extending the set.
