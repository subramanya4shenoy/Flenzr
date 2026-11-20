# Offers

Offers reuse the campaign, application and shared collaboration records. Existing direct enquiries remain private direct Offers; they are not automatically published or converted into a multi-creator brief.

## Brand flow

1. Open **Offers** in the brand menu and create an Offer. New drafts default to **Invitation only**; choose **Public** for an openly shareable brief.
2. Enter the brief, deliverables, niche, planned total budget and application closing date, then save and publish.
3. Open the dedicated Offer page and use **Share Offer**. Public links show a read-only brief before sign-in. Private links reveal no brief until the viewer signs in as the owning brand or an invited creator.
4. Invite a creator by their Flenzr handle and an individual quote. Send that creator the share link. The form saves access; it does not send an external email.
5. Review each application privately. Counter its quote, decline it or select the creator at their proposed terms. Multiple creators can be selected independently.
6. Start each selected creator’s collaboration. Both parties must accept the same proposal version before that application is shown as claimed. Existing delivery, review, proof and completion workflows then apply.

Pausing or closing an Offer stops new applications, selections and counters. Existing collaborations continue independently. The total budget describes the brief and does not impose a one-creator limit or automatically reserve funds. Payments are not live.

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

Automated tests cover private access/application denial, public field whitelisting, private drafts, multiple selections, counter history, retries, stale revisions, rejecting one’s own terms, paused Offers and collaboration quote handoff. Browser checks use isolated test accounts and a real cookie BFF/API/database: creator application, brand counter, creator acceptance, collaboration navigation, private invitation grant and outsider denial. The 390px layout has no horizontal overflow. Google sign-in return-path tests include the dedicated Offer route.

Validation: 565 backend tests passed (17 optional checks skipped in the default run), 154 web tests passed, TypeScript and focused ESLint passed. The explicit PostgreSQL race test also passed separately: competing counters produce one success and one conflict; simultaneous retries of an acceptance preserve a single revision and the agreed quote. Mutual agreement is tested before the claimed flag can become true.

## Quick manual check

1. As a brand, save and publish a private Offer, then open it and copy its link.
2. Open the link signed out or as an uninvited creator: the private brief must remain hidden.
3. Invite your test creator by Flenzr handle. As that creator, open the same link and apply with a quote.
4. As the brand, refresh the Offer and send a counter. As the creator, refresh and accept it.
5. Start the collaboration and confirm its quote matches the accepted counter. Agree on the proposal from both accounts, then refresh the Offer to see the claimed state.
6. Repeat with another creator on the same Offer; selection of the first creator must not close the Offer or replace either application.
