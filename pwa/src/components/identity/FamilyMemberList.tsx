import type { FamilyMember } from '@/types/domain';

interface FamilyMemberListProps {
  members: FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FamilyMemberList({ members, selectedId, onSelect }: FamilyMemberListProps) {
  if (!members || members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-charcoal-400">
        No family members yet. Add one below!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2" role="listbox" aria-label="Family members">
      {members.map((member) => {
        const selected = member.id === selectedId;
        return (
          <li key={member.id} role="option" aria-selected={selected}>
            <button
              type="button"
              data-hint={member.id === members[0]?.id ? 'member-select' : undefined}
              onClick={() => onSelect(member.id)}
              className={[
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all',
                'focus:outline-none focus:ring-2 focus:ring-sage-green/40',
                selected
                  ? 'bg-sage-green text-cream shadow-card'
                  : 'bg-white text-charcoal shadow-card hover:bg-sage-green/10',
              ].join(' ')}
            >
              <span className="text-2xl" aria-hidden="true">
                {member.emoji}
              </span>
              <span className="font-medium">{member.name}</span>
              {selected && (
                <span className="ml-auto text-xs font-semibold text-cream/80">Selected</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
