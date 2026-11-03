export type NoteType = "observation" | "verbal_warning" | "written_warning" | "final_warning" | "pip_referral";

export const NOTE_TYPES: { value: NoteType; label: string; hint: string }[] = [
  { value: "observation", label: "Observation / coaching", hint: "Informal note of a concern. Not shown to the employee." },
  { value: "verbal_warning", label: "Verbal warning", hint: "Spoken warning, recorded here. Not shown to the employee." },
  { value: "written_warning", label: "Written warning", hint: "Shown to the employee, who signs to confirm receipt." },
  { value: "final_warning", label: "Final warning", hint: "Shown to the employee, who signs to confirm receipt." },
  { value: "pip_referral", label: "PIP referral", hint: "Shown to the employee, who signs to confirm receipt." },
];

/** Formal records are visible to the employee and need their sign-off. */
export const isFormalNote = (t: NoteType) => t === "written_warning" || t === "final_warning" || t === "pip_referral";
export const noteTypeLabel = (t: NoteType) => NOTE_TYPES.find((x) => x.value === t)?.label ?? t;
