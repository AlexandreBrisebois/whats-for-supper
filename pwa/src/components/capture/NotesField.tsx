'use client';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesField({ value, onChange }: NotesFieldProps) {
  const MAX_LENGTH = 200;

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
        placeholder="Add a note (optional)"
        maxLength={MAX_LENGTH}
        className="rounded-2xl border-2 border-indigo/30 bg-lavender px-4 py-3 text-sm focus:border-indigo focus:outline-none resize-none"
        rows={2}
      />

      {value.length > 0 && (
        <p className="text-xs text-charcoal-400">{value.length} / {MAX_LENGTH}</p>
      )}
    </div>
  );
}
