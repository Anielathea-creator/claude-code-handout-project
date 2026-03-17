# CLAUDE.md – Project Instructions & Self-Verification Protocol

## Project Overview

This is a **web-based dossier editor for teachers** (Lehrmittel-Editor). Teachers can create, edit, and export educational materials ("Dossiers") containing structured exercises, cheat sheets, and teaching content. The app features a WYSIWYG HTML editor optimized for A4 print layout, an AI assistant (powered by Google Gemini) that generates and modifies content, and PDF export.

**Core features:**

- **WYSIWYG Editor** (`Editor.tsx`) – ContentEditable-based HTML editor with toolbar for formatting, images, image markers, drag & drop, table editing, zoom, and design tools (frames, background colors, emoji insertion). Outputs HTML with Tailwind CSS classes.
- **AI Chat Assistant** (`AIChat.tsx`) – Sidebar chat using Google Gemini (`gemini-3-flash-preview`) that can generate dossier drafts, modify HTML via `<action>` tags, and answer teacher questions about the current document.
- **Wizard Modal** (`WizardModal.tsx`) – Multi-step wizard (4 steps) for creating new dossiers. Supports two modes: AI-generated exercises or importing existing documents (PDF/TXT upload with base64 encoding).
- **PDF Export** – Uses `html2canvas` + `jsPDF` to render the editor content to a multi-page A4 PDF. Includes page breaks (`div.page-break`), a title page, and a table of contents.
- **Snapshot System** – Version history for undo/restore of entire document states. Snapshots are created automatically before AI actions.
- **Solution Toggle** – Show/hide mode for answers (`is-answer`, `is-strikethrough-answer` classes) to switch between teacher view and student view.
- **Exercise Templates** – Predefined HTML templates for different exercise types (defined in `constants.ts` as `EXERCISE_TEMPLATES`).
- **Multi-Project Sidebar** (`Sidebar.tsx`) – Manage multiple dossiers with rename, delete, and cache clearing.
- **Error Boundary** (`ErrorBoundary.tsx`) – React class component for graceful error handling.

**Language:** The entire UI is in **German**. All AI system prompts, labels, and user-facing text are in German.

## Tech Stack

- **Language:** TypeScript (React with functional components and hooks)
- **Styling:** Tailwind CSS (utility classes used directly in HTML output and components)
- **AI Integration:** Google Gemini via `@google/genai` SDK (model: `gemini-3-flash-preview`)
- **PDF Export:** `html2canvas` + `jsPDF` (client-side rendering)
- **Markdown Rendering:** `react-markdown` (for AI chat responses)
- **Icons:** `lucide-react`
- **State Management:** React `useState` / `useRef` / `useMemo` (no external state library)
- **Editor Approach:** Native `contentEditable` with manual DOM manipulation (no rich-text editor library like TipTap or Slate)

## Code Style & Conventions

- Follow the existing code style and naming conventions in the project.
- Prefer small, focused functions with clear responsibilities.
- Add comments only where the logic is non-obvious.
- Never leave `console.log` or debug statements in production code.

---

## ✅ Self-Verification Protocol

**After every code change, Claude MUST verify the change works correctly before considering the task done.**
This is non-negotiable. Do not report a task as complete without running through the relevant verification steps below.

### 1. General Verification (applies to all changes)

After making any code modification:

- [ ] **Syntax check** – Run the linter/type-checker (e.g. `npm run lint`, `tsc --noEmit`) and confirm zero errors.
- [ ] **Unit tests** – Run the relevant test suite (e.g. `npm test`) and confirm all tests pass.
- [ ] **Build check** – Run `npm run build` (or equivalent) and confirm the build succeeds without warnings or errors.
- [ ] **No regressions** – Confirm that existing functionality adjacent to the changed code still works.

---

### 2. Feature-Specific Verification

Use the verification steps that match the type of change made.

#### 📄 PDF Export Verification

When changes involve PDF generation or export:

- [ ] **Trigger the export** – Run the export function or navigate to the feature and initiate an export. Save the resulting PDF file.
- [ ] **Open and inspect the PDF** – Open the generated PDF and visually inspect it.
- [ ] **Layout** – Check that all sections, headers, and content appear in the expected positions. Nothing should be cut off at page boundaries.
- [ ] **Colors & Branding** – Check that colors match the design spec (correct hex values, no fallback grays, correct contrast).
- [ ] **No overlaps** – Verify that text, images, and UI elements do not overlap each other.
- [ ] **Fonts & Typography** – Check that fonts render correctly and text is readable at all sizes.
- [ ] **Page margins & spacing** – Verify consistent margins and padding throughout the document.
- [ ] **Multi-page behavior** – If the content spans multiple pages, verify each page is correct and page breaks occur at sensible points.
- [ ] **Dynamic content** – Test with both minimal data (edge case: empty fields, short strings) and large data (edge case: long strings, many rows/items).

> 📸 **Tip:** Take a screenshot of the PDF output (or use a PDF-to-image tool) and compare it against the design reference if one exists.

---

#### 🖥️ UI / Frontend Verification

When changes involve UI components or styling:

- [ ] **Visual inspection** – Open the affected page/component in a browser and confirm it renders correctly.
- [ ] **Responsive behavior** – Test at common breakpoints (mobile, tablet, desktop).
- [ ] **Interactive states** – Test hover, focus, active, disabled states for all interactive elements.
- [ ] **Edge cases** – Test with empty states, loading states, error states, and long content.
- [ ] **Cross-browser** – If relevant, test in more than one browser.

---

#### 🔌 API / Backend Verification

When changes involve APIs, data processing, or backend logic:

- [ ] **Manual test request** – Send a test request (e.g. using `curl`, a test script, or Postman) and verify the response is correct.
- [ ] **Error handling** – Verify that invalid inputs return appropriate error messages and status codes.
- [ ] **Data integrity** – Confirm that data is stored/retrieved correctly and no data is lost or corrupted.
- [ ] **Performance** – Confirm there are no obvious performance regressions (e.g. no N+1 queries).

---

#### 🗄️ Database / Migration Verification

When changes involve database schema or migrations:

- [ ] **Migration runs cleanly** – Run the migration and confirm it completes without errors.
- [ ] **Rollback works** – Confirm the rollback/down migration also works correctly.
- [ ] **Existing data** – Confirm existing records are not corrupted or lost after the migration.

---

### 3. Verification Report

After completing all relevant verification steps, include a short **Verification Report** in your response:

```
## Verification Report

**Change made:** [Brief description of what was changed]

**Steps performed:**
- ✅ Linter: no errors
- ✅ Tests: all 42 tests pass
- ✅ Build: successful
- ✅ PDF export tested: layout correct, no overlaps, colors match spec
- ✅ Edge case tested: empty data set renders placeholder correctly

**Result:** Change verified and working as expected.
```

If any step **fails**, do not mark the task as done. Instead:
1. Describe what failed and why.
2. Attempt to fix the issue.
3. Re-run the verification steps.
4. Only report success after all checks pass.

---

## Common Commands

<!-- TODO: Add the commands specific to your project -->
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

---

## Project-Specific Notes

### Editor Architecture
- The editor uses native `contentEditable` – there is no rich-text library. All formatting is done via direct DOM manipulation and `document.execCommand` or manual `Range`/`Selection` API usage. Be extremely careful when modifying editor logic, as DOM state and React state can easily get out of sync.
- The editor output is raw HTML with Tailwind classes. The `onChange` callback serializes the DOM content back to an HTML string.

### CSS Classes with Special Meaning
- `editable` – Marks elements as user-editable (p, h1, h2, h3, td, th, li).
- `is-answer` – Content visible only in teacher/solution mode. Hidden in student mode.
- `is-strikethrough-answer` – Shown with strikethrough in solution mode, normal in student mode.
- `gap-line` / `gap-line is-answer` – Underlined blank or fill-in-the-gap answer fields.
- `schreib-linie` – Lined area for longer written answers.
- `page-break avoid-break` – Forces a page break in PDF export.
- `avoid-break` – Prevents element from being split across pages.
- `title-page-placeholder` – Marks the cover/title page.
- `marker-container` / `image-marker` – Image annotation markers.
- `draggable-image-wrapper` – Wrapper for drag-and-drop images.

### AI Integration
- The Gemini API key is read from `import.meta.env.VITE_GEMINI_API_KEY`.
- AI chat history is pruned to the last 15 messages before API calls to stay within token limits. Base64 image attachments are stripped from older messages.
- The AI can modify the editor content via `<action type="update_html">` and `<action type="update_theme">` tags embedded in its response.
- A snapshot is automatically created before any AI-driven HTML modification.

### PDF Export
- PDF generation uses `html2canvas` to render the editor DOM to canvas, then `jsPDF` to assemble pages.
- The layout targets A4 format with `p-[2cm]` padding.
- Stale clones from `html2canvas` are cleaned up on page load to prevent freezing.
- The cover page uses `min-h-[29.7cm]` to fill an entire A4 page.

### Theme System
- Available themes: `blue`, `emerald`, `purple`, `amber`, `rose`.
- Theme colors are applied via Tailwind classes like `text-{theme}-700`, `bg-{theme}-50`.
- The theme name is interpolated into Tailwind classes dynamically (e.g., `text-${theme}-700`). Ensure all used color variants are safelisted in the Tailwind config or JIT is enabled.

### Known Gotchas
- `Editor.tsx` is very large (~1500+ lines). When making changes, work on isolated functions and test incrementally.
- The global cleanup in `Editor.tsx` (removing stale `html2canvas` clones on load) is intentional and must not be removed.
- File upload in the wizard converts files to base64 (`FileReader.readAsDataURL`) and sends them inline to Gemini. Only PDF, TXT, CSV, and MD are supported – `.docx` is explicitly not supported for direct AI processing.