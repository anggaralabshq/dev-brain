export type NoteTemplate = {
  id: string;
  name: string;
  description: string;
  category: "daily" | "engineering" | "meetings" | "planning";
  icon: string; // lucide icon name
  content: string; // HTML for Tiptap
};

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "daily-note",
    name: "Daily Note",
    description: "Journal harian: apa yang dikerjakan, blockers, dan goals besok.",
    category: "daily",
    icon: "CalendarDays",
    content: `<h1>Daily Note — ${new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</h1><h2>✅ Selesai hari ini</h2><ul><li><p></p></li></ul><h2>🚧 Sedang dikerjakan</h2><ul><li><p></p></li></ul><h2>🔴 Blockers</h2><ul><li><p></p></li></ul><h2>📌 Goals besok</h2><ul><li><p></p></li></ul>`,
  },
  {
    id: "standup",
    name: "Standup Notes",
    description: "Format standup klasik: yesterday, today, blockers.",
    category: "meetings",
    icon: "Users",
    content: `<h2>Standup — ${new Date().toLocaleDateString()}</h2><h3>Yesterday</h3><ul><li><p></p></li></ul><h3>Today</h3><ul><li><p></p></li></ul><h3>Blockers</h3><ul><li><p>None</p></li></ul>`,
  },
  {
    id: "adr",
    name: "Architecture Decision Record",
    description: "Dokumen keputusan arsitektur dengan context, options, dan consequences.",
    category: "engineering",
    icon: "ScrollText",
    content: `<h1>ADR-XXX: [Title]</h1><p><strong>Status:</strong> Proposed | Accepted | Deprecated | Superseded</p><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><h2>Context</h2><p>Apa masalah atau kebutuhan yang mendorong keputusan ini?</p><h2>Decision</h2><p>Keputusan yang diambil.</p><h2>Options Considered</h2><ul><li><p><strong>Option A:</strong> …</p></li><li><p><strong>Option B:</strong> …</p></li></ul><h2>Consequences</h2><h3>Positive</h3><ul><li><p></p></li></ul><h3>Negative</h3><ul><li><p></p></li></ul><h2>References</h2><ul><li><p></p></li></ul>`,
  },
  {
    id: "tech-design",
    name: "Technical Design Doc",
    description: "Template design doc lengkap: problem, solution, implementation plan.",
    category: "engineering",
    icon: "FileCode",
    content: `<h1>Technical Design: [Feature Name]</h1><p><strong>Author:</strong> <strong>Date:</strong> ${new Date().toLocaleDateString()} <strong>Status:</strong> Draft</p><h2>Summary</h2><p>Satu paragraf ringkas tentang apa yang akan dibangun.</p><h2>Problem Statement</h2><p>Masalah apa yang diselesaikan? Mengapa sekarang?</p><h2>Goals</h2><ul><li><p></p></li></ul><h2>Non-Goals</h2><ul><li><p></p></li></ul><h2>Proposed Solution</h2><p>Describe the solution in detail.</p><h2>Implementation Plan</h2><ol><li><p></p></li></ol><h2>Risks & Mitigations</h2><ul><li><p><strong>Risk:</strong> … <strong>Mitigation:</strong> …</p></li></ul><h2>Open Questions</h2><ul><li><p></p></li></ul>`,
  },
  {
    id: "bug-report",
    name: "Bug Report",
    description: "Template dokumentasi bug: reproduction steps, expected vs actual behavior.",
    category: "engineering",
    icon: "Bug",
    content: `<h1>Bug: [Short Description]</h1><p><strong>Severity:</strong> Critical | High | Medium | Low<br><strong>Reported:</strong> ${new Date().toLocaleDateString()}<br><strong>Status:</strong> Open</p><h2>Description</h2><p>Deskripsi singkat bug.</p><h2>Steps to Reproduce</h2><ol><li><p></p></li></ol><h2>Expected Behavior</h2><p></p><h2>Actual Behavior</h2><p></p><h2>Environment</h2><ul><li><p>OS: </p></li><li><p>Browser/Runtime: </p></li><li><p>Version: </p></li></ul><h2>Logs / Screenshots</h2><p></p><h2>Root Cause (if known)</h2><p></p><h2>Fix</h2><p></p>`,
  },
  {
    id: "sprint-retro",
    name: "Sprint Retrospective",
    description: "Retrospective sprint: what went well, what didn't, action items.",
    category: "meetings",
    icon: "IterationCcw",
    content: `<h1>Sprint Retrospective — Sprint [N]</h1><p><strong>Date:</strong> ${new Date().toLocaleDateString()} <strong>Team:</strong></p><h2>😊 What Went Well</h2><ul><li><p></p></li></ul><h2>😔 What Didn't Go Well</h2><ul><li><p></p></li></ul><h2>💡 Improvements / Action Items</h2><ul><li><p><strong>Action:</strong> <strong>Owner:</strong> <strong>Due:</strong> </p></li></ul><h2>Team Health Check</h2><p>Scale 1-5: <strong>Morale:</strong> / <strong>Velocity:</strong> / <strong>Clarity:</strong></p>`,
  },
  {
    id: "code-review",
    name: "Code Review Notes",
    description: "Catat temuan code review: issues, suggestions, dan approval status.",
    category: "engineering",
    icon: "GitPullRequest",
    content: `<h1>Code Review: [PR Title / PR #]</h1><p><strong>Reviewer:</strong> <strong>Date:</strong> ${new Date().toLocaleDateString()}<br><strong>Author:</strong> <strong>Status:</strong> In Review</p><h2>Summary</h2><p>Apa yang di-review?</p><h2>🔴 Must Fix (Blockers)</h2><ul><li><p></p></li></ul><h2>🟡 Should Fix (Suggestions)</h2><ul><li><p></p></li></ul><h2>🟢 Nitpicks / Nice to Have</h2><ul><li><p></p></li></ul><h2>✅ Positive Notes</h2><ul><li><p></p></li></ul><h2>Decision</h2><p>Approved / Request Changes / Comment</p>`,
  },
];

export function getTemplate(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}
