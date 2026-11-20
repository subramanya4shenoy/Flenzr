# Private collaboration files (Step 24)

The saved creator can attach private multimedia files to an agreed collaboration's delivery. External HTTPS links still work, including on existing versions. Both participants see the same fixed file metadata in submission history; approval and completion refer to that exact version.

## Storage and access

- Bytes live in the dedicated **private** Supabase `collaboration-files` bucket. PostgreSQL holds reservations, ownership, declared size/type and the delivery reference. Submitted metadata is also copied into immutable delivery JSON.
- The API authorizes the saved participant IDs; workspace membership or guessing a file ID does not grant access. Uploads/removal are creator-only and close on completion. Downloads remain available to both saved participants after completion.
- Browser uploads go directly to Supabase TUS using a signed capability scoped to one server-generated object path. Use `/storage/v1/upload/resumable/sign`, `x-signature`, 6 MiB chunks and no overwrite. The service-role key stays on the backend. No session JWT is exposed by this flow.
- The bucket rejects unsupported MIME types and oversized objects. The backend verifies actual Storage size/MIME and a bounded file-header signature before making a file attachable. This is file-format screening, **not a malware scan or a complete media/PDF parser**. Downloads use attachment disposition; inline previews are not implemented in this step.
- Downloads are minted only for submitted, authorized files and last **120 seconds**. The API/BFF response is `no-store`; signed URLs are not persisted in deliveries. A link is a bearer capability until it expires—do not share it outside the collaboration.
- A restrictive `storage.objects` policy blocks direct anon/authenticated access to this bucket even if unrelated permissive policies exist. Application metadata is protected by RLS. A database trigger prevents changes/deletion once file metadata is attached to a delivery.

## Limits and lifecycle

Default: **50 MiB per file**, up to **10 files and 10 links per version**. Supported: JPEG, PNG, WebP, MP4, MOV, WebM, MP3, WAV, M4A and PDF, with matching filename extensions. No HTML, SVG, executables or arbitrary binary uploads. The project-wide Storage upload limit must also allow the configured size.

A collaboration can issue at most 20 reservations in 48 hours, including removed reservations. Ready drafts are listed only to their creator and expire after 24 hours. Failed transfers can retry/resume while the editor remains open; a completed transfer retries verification without uploading again. A refreshed editor recovers verified drafts, with explicit selection before submission. Transfer URLs are not stored in browser local storage. A full page reload during an unfinished transfer requires choosing the file again.

Removing a draft immediately blocks attachment/download through Flenzr. Its object is deliberately retained until all upload capabilities have expired: signed upload tokens last two hours, can only be reissued during the reservation's first two hours, and TUS URLs live up to 24 hours. Deleting the object early could let a still-valid upload recreate it. Submitted files cannot be removed through the draft endpoint; send a new delivery version for changes.

Run the cleanup command periodically (for example hourly in the production scheduler):

```sh
cd backend
DEBUG=false .venv/bin/python -m app.cleanup_collaboration_files
```

It deletes only unattached reservations older than 48 hours, including removed/abandoned drafts, in bounded batches. It shares the collaboration lock with submission/removal, retries storage failures without forgetting keys, and never deletes submitted files. **Production scheduling of this command still needs deployment configuration.** This task adds no deadline notifications or reminder jobs.

## Configuration

Server-only existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required. New optional settings:

```dotenv
COLLABORATION_STORAGE_BUCKET=collaboration-files
COLLABORATION_FILE_MAX_BYTES=52428800
```

Provision after migration `0025_collaboration_files`:

```sh
cd backend
DEBUG=false .venv/bin/python -m alembic upgrade head
DEBUG=false .venv/bin/python -m scripts.setup_collaboration_storage
```

The setup script manages only the dedicated bucket, applies MIME/size limits and the restrictive object policy, and refuses to reuse a public bucket. It was applied to the current development Supabase project. No extra user-facing environment key or public bucket is needed. To raise file limits later, update the backend setting, the project's Storage upload limit and rerun bucket setup. Older submitted files remain unchanged.

## Manual test

1. Open an **agreed** collaboration as its saved creator. In Deliveries, choose **New delivery submission** (or **Submit a new version**).
2. Add a title, choose a supported file below 50 MiB, and wait for upload progress/verification. Its checkbox becomes selected. Links are optional when a file is selected.
3. Click **Review delivery**, check the file name/size, then **Submit delivery**. Refresh: the file stays in that version's history.
4. Sign in as the saved brand/client and open the same collaboration. Download the file and review/approve that version. The download starts without a permanent public URL.
5. As the creator, upload another draft and choose **Remove**. It disappears and cannot be submitted. Removing an attached file through the API must fail; earlier versions remain downloadable.
6. Try an SVG/executable or a file over the displayed limit. The form rejects it. Stop/interfere with the upload or verification request: **Retry upload** must recover without duplicating the attachment or delivery.
7. Refresh before submission: verified drafts reappear but must be explicitly selected. Unsaved title/notes are not persisted as drafts.
8. In an unrelated account, request the file/download endpoint: it must return 404. Logged-out access must return 401. Direct public-bucket URLs must fail.
9. A previously issued download URL must stop working after two minutes; requesting a fresh download as an authorized participant must work.

## Validation

517 backend tests and 147 web tests pass; TypeScript, focused lint and the isolated production build pass. Automated API coverage includes authorization, forged metadata/path rejection, size/MIME/header verification, draft lifecycle, request replay, attachment validation, budget, cleanup and storage adapter behavior. Native PostgreSQL verifies concurrent submission replay, RLS and submitted-file immutability. Real Supabase tests exercised signed TUS upload, private download, public-access denial and expired download rejection. The production browser journey exercised creator upload, file-only submission, lost-response replay, brand download/approval, outsider denial, removal, preserved version history and mobile width.
