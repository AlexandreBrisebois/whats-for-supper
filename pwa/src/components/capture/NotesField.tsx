'use client';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function NotesField({ value, onChange }: NotesFieldProps) {
  const MAX_LENGTH = 200;

  return (
    <div className="group flex flex-col gap-3">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Toss in some notes... (optional)"
          maxLength={MAX_LENGTH}
          className="w-full rounded-[1.5rem] border-2 border-indigo/5 bg-white/50 px-5 py-4 text-sm font-medium text-charcoal shadow-sm backdrop-blur-sm transition-all placeholder:text-charcoal-200 focus:border-indigo/20 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo/5 resize-none min-h-[100px]"
          rows={3}
        />
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo/[0.03] text-[10px] font-bold tracking-wider text-indigo/40 transition-opacity group-focus-within:opacity-100">
          <span className={value.length >= MAX_LENGTH ? 'text-pink' : ''}>{value.length}</span>
          <span className="opacity-30">/</span>
          <span>{MAX_LENGTH}</span>
        </div>
      </div>
    </div>
  );
}
