'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { FamilyMember } from '@/types/domain';
import { useFamily } from '@/hooks/useFamily';
import { t, tWithVars } from '@/locales';

interface FamilyMemberListProps {
  members: FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function FamilyMemberList({ members, selectedId, onSelect }: FamilyMemberListProps) {
  const { updateMember, isLoading } = useFamily();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  if (!members || members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-charcoal-400">
        {t('family.noMembers', 'No family members yet. Add one below!')}
      </p>
    );
  }

  const startEditing = (member: FamilyMember) => {
    setEditingId(member.id);
    setEditName(member.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await updateMember(id, editName);
    setEditingId(null);
  };

  return (
    <ul className="flex flex-col gap-2" role="listbox" aria-label="Family members" data-hint="family-list">
      {members.map((member) => {
        const selected = member.id === selectedId;
        const isEditing = editingId === member.id;

        return (
          <li key={member.id} role="option" aria-selected={selected}>
            {isEditing ? (
              <div className="flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-card ring-2 ring-indigo">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-xl bg-indigo/5 px-3 py-2 text-sm font-medium text-charcoal focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdate(member.id);
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
                <button
                  onClick={() => handleUpdate(member.id)}
                  disabled={isLoading || !editName.trim()}
                  className="rounded-full p-2 text-indigo hover:bg-indigo/10 disabled:opacity-30"
                  aria-label={t('family.saveName', 'Save name')}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={isLoading}
                  className="rounded-full p-2 text-charcoal-400 hover:bg-charcoal-100"
                  aria-label={t('family.cancelEditing', 'Cancel editing')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(member.id)}
                  className={[
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-indigo/40',
                    selected
                      ? 'bg-indigo text-lavender shadow-card pr-24' // Add padding for "Selected" and "Edit"
                      : 'bg-white text-charcoal shadow-card hover:bg-indigo/10 pr-12', // Add padding for "Edit"
                  ].join(' ')}
                >
                  <span className="font-medium truncate">{member.name}</span>
                  {selected && (
                    <span className="ml-auto text-xs font-semibold text-lavender/80">
                      {t('family.selected', 'Selected')}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditing(member);
                  }}
                  className={[
                    'absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2.5 transition-all',
                    // On mobile, show it always for selected, otherwise group-hover
                    selected 
                      ? 'opacity-100 text-lavender hover:bg-white/20' 
                      : 'opacity-0 group-hover:opacity-100 text-indigo hover:bg-indigo/10',
                    // For touch devices, ensure it's at least visible if active or selected
                  ].join(' ')}
                  aria-label={tWithVars('family.editMember', 'Edit {{name}}', { name: member.name })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
