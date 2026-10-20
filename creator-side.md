# Flenzr — Creator-Side Roadmap & Task Tracker

This document outlines the end-to-end task roadmap for completing and polishing the **Creator side** of Flenzr before shifting focus to the brand portal.

---

## 1. Collab Pipeline & Deliverable Workflow
**Primary File**: [`web/src/components/creator/creator-collab-pipeline.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/components/creator/creator-collab-pipeline.tsx)

- [x] **Interactive Draft Submission Modal**
  - Add modal for the "Submit Draft" action on Vault-secured deals.
  - Form fields: Video URL (YouTube Unlisted, Frame.io, Google Drive, Loom), Version tag (`v1`, `v2`), and Review Notes for the sponsor.
  - Watermark toggle option ("Add preview watermark overlay").
  - On submit, transitions deal to `Brand Review` stage with draft link and timestamp attached.

- [x] **Client Revision & Feedback Viewer**
  - Dedicated view for deals in the `Brand Review` stage.
  - Display timestamped client feedback and change requests.
  - "Submit Revision v2" action enabling creators to address feedback and upload an updated cut.

- [x] **Vault Release & Completion Flow**
  - Simulated "Brand Approval" action that marks the deal `Completed & Paid`.
  - Automatically triggers addition of new Section 194J tax invoice in the Vault view.
  - Automatically credits the payout amount to the creator's "Available for Instant Payout" balance.

---

## 2. Flenzr Vault: Payout & Compliance Settings
**Primary File**: [`web/src/components/creator/creator-wallet-view.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/components/creator/creator-wallet-view.tsx)

- [ ] **Bank Account & UPI Management Modal**
  - Editable payout details:
    - Bank Name (HDFC, ICICI, SBI, Axis, etc.)
    - Account Holder Name & Account Number
    - IFSC Code
    - UPI ID (e.g., `creator@okhdfcbank`)
    - PAN Card Number (for 10% Section 194J TDS compliance certificates)
  - Persist settings in `localStorage` and backend.

- [ ] **Dynamic Withdrawal Simulation**
  - Update the "Withdraw to Bank Account" flow to withdraw directly to the creator's selected Bank/UPI.
  - Dynamic balance deduction from "Available for Payout" to verified ledger entry.

- [ ] **Invoice PDF Viewer / Print Preview**
  - Replace the alert on "Download PDF" with an on-screen preview or downloadable print-ready invoice layout displaying GSTIN, TDS breakdown, and client details.

---

## 3. Rate Cards & Deliverables Management
**Primary File**: [`web/src/app/dashboard/creator/page.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/app/dashboard/creator/page.tsx)

- [ ] **Edit Existing Rate Cards**
  - Add "Edit" button next to "Delete" on each rate card card.
  - Edit modal allowing creators to adjust Price (₹), Turnaround Days, Package Title, and Platform.

- [ ] **Live Sync with Public Media Kit**
  - Ensure changes to rate cards (add, edit, delete) immediately update in `flenzr_creator_profile` / backend so that viewing `/[username]` reflects the newest packages in real-time.

- [ ] **Deliverable Add-Ons Configuration**
  - Allow creators to toggle and customize their licensing add-ons:
    - UGC Social Rights (+30%)
    - 30-Day Paid Meta Whitelisting (+50%)
    - Category Exclusivity (90d) (+100%)
    - Raw 4K B-Roll Handover (Flat fee)

---

## 4. AI Deal Negotiator Integration
**Primary File**: [`web/src/components/creator/creator-ai-pitcher.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/components/creator/creator-ai-pitcher.tsx)

- [ ] **Apply Counter-Offer to Active Deal**
  - Add button: "Apply Counter-Offer to Pipeline Deal".
  - Dropdown to select which inbound deal (e.g. *Nothing India*, *Zebronics*) to update.
  - Automatically updates the deal's requested budget and appends the counter-pitch to the deal notes.

- [ ] **Category-Specific CPM Benchmarks**
  - Adjust the AI rate calculator based on selected category (Tech, Fashion, Fitness, Finance) to reflect realistic Indian and global CPM rates.

---

## 5. Collab & Shoot Calendar Interactivity
**Primary File**: [`web/src/components/creator/creator-schedule-calendar.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/components/creator/creator-schedule-calendar.tsx)

- [ ] **Add Custom Event / Shoot Date Modal**
  - "+ Add Shoot Date / Deliverable" button.
  - Form fields: Event Title, Brand Name, Deliverable Type, Date, Time, and Status.
  - Adds event directly to the interactive calendar grid.

- [ ] **Auto-Populate Calendar from Pipeline Deals**
  - Automatically synchronize due dates from active Pipeline deals onto the calendar view.

---

## 6. Public Profile & Booking Experience
**Primary File**: [`web/src/components/creator/public-creator-profile-view.tsx`](file:///Users/subu/flenzr/Flenzr/web/src/components/creator/public-creator-profile-view.tsx)

- [ ] **Interactive Booking Inquiry Flow**
  - When a brand submits a booking via the "Book Collab" modal, automatically inject it into the creator's Collab Pipeline as an `Inbound Inquiry`.
  - Display confirmation with the exact package and timeline selected.

---

## Summary Checklist

| Workflow | Status | Priority |
| :--- | :---: | :---: |
| 1. Pipeline Draft Submission & Feedback Modals | Completed | High |
| 2. Vault Bank Account & Payout Settings | Planned | High |
| 3. Rate Card Editing & Live Sync | Planned | Medium |
| 4. AI Pitcher Direct Pipeline Counter-Offer | Planned | Medium |
| 5. Calendar Shoot Date Creation | Planned | Low |
| 6. Public Booking to Pipeline Auto-Sync | Planned | High |
