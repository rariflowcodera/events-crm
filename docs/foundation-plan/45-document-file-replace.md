# Stage 45: Document File Replacement

> **Parent**: [00-overview.md](./00-overview.md) | **Status**: Proposed

## Objective

Allow users to replace the underlying file of an already-uploaded event document (PDF/image) without deleting and re-creating the document record. Today `eventDocuments.update` (`trpc/routers/event-documents.ts:143-185`) only lets a user change `name`, `type`, and `categoryIds` — the `fileName`, `url`, `mimeType`, and `fileSize` columns are set once at `create` and are otherwise immutable. If a user uploads the wrong version of a schedule or map, their only option is to delete the document and re-upload, which:

- Generates a new `documentId`, breaking any `{{document.<id>}}` variable already inserted into email templates (`components/email-templates/document-inserter.tsx`).
- Loses the document's position/history in the list (new `createdAt`).

This stage adds a "Replace File" action that keeps the document's `id`, `name`, `type`, and `categoryIds` intact while swapping the stored file and its derived metadata.

---

## Background

- Upload flow: `components/documents/document-upload-dialog.tsx` → `hooks/use-document-upload.ts` → `POST /api/document-upload` (issues a local upload URL or S3 pre-signed URL, validates type/size/membership) → actual file transfer → `eventDocuments.create` (`trpc/routers/event-documents.ts:91-140`).
- Edit flow: `components/documents/document-row.tsx` has an "Edit" dropdown item opening a dialog that calls `eventDocuments.update`, limited to metadata fields.
- Storage: `STORAGE_PROVIDER_ENV` toggles between `local` (files under `uploads/documents/<eventId>/`, served via `/api/document-file`) and `s3` (KSA constraint: S3 bucket must be in `me-south-1`, per `env.ts` / infra plan). Neither provider currently deletes the old object when a document record changes — `eventDocuments.delete` (`trpc/routers/event-documents.ts:188-214`) removes only the DB row, never the stored file. This stage follows that same existing convention: replacing a file leaves the old object in storage (no cleanup path exists yet for any document mutation); adding storage cleanup is out of scope here and would need to cover `delete` too.
- Documents are referenced from email templates by `id`, not by `url` (`{{document.<id>}}`, resolved in `document-inserter.tsx` / email send pipeline), so keeping the `id` stable is what makes in-place replacement valuable over delete+recreate.

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| New endpoint vs. extend `update` | New dedicated mutation `eventDocuments.replaceFile` | Keeps metadata editing and file replacement as separate, single-purpose operations (matches router's existing pattern of narrow mutations); avoids overloading `update`'s input with optional file fields that are meaningless 95% of the time. |
| Which fields change | `fileName`, `url`, `mimeType`, `fileSize`, `updatedAt`. `name`, `type`, `categoryIds`, `id`, `createdAt`, `createdBy` untouched. | Preserves template variable references and list position; only the physical file and its derived metadata are new. |
| File type/size validation | Same as initial upload — `ALLOWED_TYPES` (`application/pdf`, `image/gif`, `image/jpeg`, `image/png`) and `MAX_FILE_SIZE` (10MB), enforced both client-side and in `/api/document-upload`. | Reuses existing validated upload path rather than inventing a second set of rules. |
| Reuse `/api/document-upload` for the new file | Yes — same route already handles membership check, rate limiting, type/size validation, and local/S3 URL issuance eventId-scoped. No changes needed there. | Avoids duplicating upload-URL logic; the route doesn't know or care whether the resulting document record is a create or a replace. |
| Old file cleanup | Not deleted (matches existing `delete` behavior — see Background). | Out of scope; no storage-cleanup mechanism exists anywhere in the codebase today. Tracked as a known gap, not introduced by this stage. |
| UI entry point | New "Replace File" item in `DocumentRow`'s actions dropdown (`components/documents/document-row.tsx`), opening a new `DocumentReplaceFileDialog`. | Matches existing per-row action pattern (Edit / Copy / Delete already live there). |
| Mismatched file type on replace | Allowed — user may replace a PDF with an image or vice versa; `mimeType` is updated to match the new file. `type` (the document *category*, e.g. "schedule"/"map") is unrelated to `mimeType` and is untouched. | The document's category is a user classification, independent of the physical file's MIME type; no reason to force the same file format on replace. |

---

## Implementation Phases

| Phase | Scope | Files | Status |
|-------|-------|-------|--------|
| 45A | Server: `replaceFile` mutation | `trpc/routers/event-documents.ts` | Proposed |
| 45B | Hook: replace-file upload flow | `hooks/use-document-upload.ts`, `trpc/hooks/document-hooks.ts` | Proposed |
| 45C | UI: Replace File dialog + dropdown entry | `components/documents/document-row.tsx`, new `components/documents/document-replace-file-dialog.tsx` | Proposed |
| 45D | Translations | `messages/en.json`, `messages/ar.json` | Proposed |

---

## 45A: Server — `replaceFile` Mutation

**Add to `trpc/routers/event-documents.ts`**, alongside `update`:

```ts
// Replace the underlying file of an existing document
replaceFile: protectedProcedure
  .input(
    z.object({
      documentId: z.string().uuid(),
      fileName: z.string(),
      url: z.string().url(),
      mimeType: z.string(),
      fileSize: z.number().max(10 * 1024 * 1024),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const document = await db.query.eventDocuments.findFirst({
      where: eq(eventDocuments.id, input.documentId),
      with: { event: true },
    })

    if (!document) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" })
    }

    const isMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, document.event.workspaceId),
        eq(workspaceMembers.userId, ctx.user.id)
      ),
    })

    if (!isMember) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this workspace" })
    }

    const [updated] = await db
      .update(eventDocuments)
      .set({
        fileName: input.fileName,
        url: input.url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        updatedAt: new Date(),
      })
      .where(eq(eventDocuments.id, input.documentId))
      .returning()

    return updated
  }),
```

Follows the exact auth/membership pattern already used by `update` and `delete` in the same router.

---

## 45B: Hook — Replace-File Upload Flow

**Update `hooks/use-document-upload.ts`:**

Extract the shared "get upload URL → transfer file" steps (currently inlined in `upload`) into a reusable internal helper, then add a second exported function `replace` that runs the same two steps but finishes by calling a new `replaceFile` mutation instead of `createDocument`:

```ts
export function useDocumentUpload(eventId: string) {
  // ...existing state...
  const { mutateAsync: createDocument } = useCreateEventDocument()
  const { mutateAsync: replaceDocumentFile } = useReplaceEventDocumentFile()

  const performTransfer = useCallback(
    async (file: File, onProgress?: (p: number) => void) => {
      const { data } = await getDocumentUploadUrl(file, eventId)
      const uploadUrl = data.storageProvider === "local" ? data.uploadUrl! : data.preSignedUrl!
      const localUrl = await uploadFile(uploadUrl, file, data.storageProvider, eventId, onProgress)
      return localUrl || data.documentUrl
    },
    [eventId]
  )

  const upload = useCallback(async (file, metadata) => {
    setIsUploading(true); setProgress(0)
    try {
      const finalUrl = await performTransfer(file, setProgress)
      await createDocument({ eventId, name: metadata.name, fileName: file.name, url: finalUrl, mimeType: file.type, fileSize: file.size, type: metadata.type, categoryIds: metadata.categoryIds })
      return finalUrl
    } finally { setIsUploading(false); setProgress(0) }
  }, [eventId, createDocument, performTransfer])

  const replace = useCallback(async (documentId: string, file: File) => {
    setIsUploading(true); setProgress(0)
    try {
      const finalUrl = await performTransfer(file, setProgress)
      await replaceDocumentFile({ documentId, fileName: file.name, url: finalUrl, mimeType: file.type, fileSize: file.size })
      return finalUrl
    } finally { setIsUploading(false); setProgress(0) }
  }, [replaceDocumentFile, performTransfer])

  return { upload, replace, isUploading, progress }
}
```

**Add to `trpc/hooks/document-hooks.ts`:**

```ts
export const useReplaceEventDocumentFile = ({ onSuccess, onError } = {}) => {
  const utils = trpc.useUtils()
  const { mutate, mutateAsync, isPending } = trpc.eventDocuments.replaceFile.useMutation({
    onSuccess: (data) => {
      toast.success("Document file replaced")
      utils.eventDocuments.getMany.invalidate({ eventId: data.eventId })
      utils.eventDocuments.getOne.invalidate({ documentId: data.id })
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message || GLOBAL_ERROR_MESSAGE)
      onError?.()
    },
  })
  return { mutate, mutateAsync, isPending }
}
```

Note: `emailTemplates.getVariables` invalidation is **not** needed here (unlike `create`/`update`/`delete`) — the set of available `{{document.<id>}}` variables is unchanged by a file replacement, only the file behind an existing variable changes.

---

## 45C: UI — Replace File Dialog + Dropdown Entry

**New `components/documents/document-replace-file-dialog.tsx`:**

A slimmed-down variant of `document-upload-dialog.tsx` — dropzone only (same `ALLOWED_TYPES`/`MAX_FILE_SIZE`, same drag-drop UI), no name/type/category inputs (those are unchanged), with a header showing the current file name being replaced. On confirm, calls `useDocumentUpload(eventId).replace(document.id, file)`.

**Update `components/documents/document-row.tsx`:**

Add a "Replace File" item to the actions dropdown (between "Edit" and "Copy Variable"), opening the new dialog:

```tsx
<DropdownMenuItem onClick={() => setIsReplaceDialogOpen(true)}>
  <Icons.upload className="mr-2 h-4 w-4" />
  {t("replaceFile.action")}
</DropdownMenuItem>
```

Render `<DocumentReplaceFileDialog open={isReplaceDialogOpen} onOpenChange={setIsReplaceDialogOpen} document={document} />` alongside the existing Edit/Delete dialogs at the bottom of the component.

---

## 45D: Translations

**Update `messages/en.json`** (`documents` namespace):

```json
"replaceFile": {
  "action": "Replace File",
  "title": "Replace Document File",
  "description": "Upload a new file to replace \"{name}\". The document's name, type, and category visibility stay the same.",
  "confirm": "Replace File"
}
```

**Update `messages/ar.json`:** Add matching Arabic translation for the above keys.

---

## Verification Checklist

### 45A: Server
- [ ] `replaceFile` updates `fileName`/`url`/`mimeType`/`fileSize`/`updatedAt`, leaves `name`/`type`/`categoryIds`/`id`/`createdAt` untouched
- [ ] Throws `NOT_FOUND` for a nonexistent `documentId`
- [ ] Throws `FORBIDDEN` for a user who isn't a workspace member
- [ ] Rejects payload with `fileSize` over 10MB (zod validation)

### 45B: Hook
- [ ] `replace()` reuses the same `/api/document-upload` URL-issuance and transfer path as `upload()` for both `local` and `s3` storage providers
- [ ] Progress reporting works identically to initial upload
- [ ] `emailTemplates.getVariables` is not invalidated by a replace (variable list is unchanged)

### 45C: UI
- [ ] "Replace File" dropdown item present on every document row
- [ ] Dialog shows the current file name and accepts only `ALLOWED_TYPES`/`MAX_FILE_SIZE`
- [ ] After a successful replace, the document row reflects the new `fileSize`/`fileName` without a page reload
- [ ] Existing `{{document.<id>}}` variables in email templates still resolve after a replace (same `id`, new `url`)

### 45D: Translations
- [ ] English translation complete
- [ ] Arabic translation complete

---

## File Structure Summary

**New files:**

```
components/documents/document-replace-file-dialog.tsx
```

**Modified files:**

```
trpc/routers/event-documents.ts
trpc/hooks/document-hooks.ts
hooks/use-document-upload.ts
components/documents/document-row.tsx
messages/en.json
messages/ar.json
```

---

## Related Documents

- [Stage 40: Public Email Links & Guest Actions Dropdown](./40-public-email-links.md)
