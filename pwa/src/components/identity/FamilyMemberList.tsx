'use client';

import { useState } from 'react';
import { Pencil, Check, X, Share2 } from 'lucide-react';
import type { FamilyMember } from '@/types/domain';
import { useFamily } from '@/hooks/useFamily';
import { t, tWithVars } from '@/locales';

interface FamilyMemberListProps {
  members: FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onInvite?: (id: string, name: string) => void;
}

export function FamilyMemberList({
  members,
  selectedId,
  onSelect,
  onInvite,
}: FamilyMemberListProps) {
  const { updateMember, isLoading } = useFamily();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    <div data-hint="family-list" data-testid="family-list" className="w-full">
      {!members || members.length === 0 ? (
        <p className="py-6 text-center text-sm text-charcoal-400">
          {t('family.noMembers', 'No family members yet. Add one below!')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" role="listbox" aria-label="Family members">
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
                      data-testid={`family-member-${member.id}`}
                      className={[
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all',
                        'focus:outline-none focus:ring-2 focus:ring-indigo/40',
                        selected
                          ? `bg-indigo text-lavender shadow-card ${onInvite ? 'pr-36' : 'pr-24'}`
                          : `bg-white text-charcoal shadow-card hover:bg-indigo/10 ${onInvite ? 'pr-28' : 'pr-12'}`,
                      ].join(' ')}
                    >
                      <span className="font-medium truncate">{member.name}</span>
                      {selected && (
                        <span className="ml-auto text-xs font-semibold text-lavender/80">
                          {t('family.selected', 'you')}
                        </span>
                      )}
                    </button>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {onInvite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInvite(member.id, member.name);
                          }}
                          className={[
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm',
                            selected
                              ? 'bg-white/20 text-lavender hover:bg-white/30 ring-1 ring-white/30'
                              : 'bg-terracotta/10 text-terracotta hover:bg-terracotta/20 ring-1 ring-terracotta/20',
                          ].join(' ')}
                        >
                          <Share2 className="h-3 w-3" />
                          {t('profile.invite', 'Invite')}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(member);
                        }}
                        className={[
                          'rounded-full p-2.5 transition-all',
                          selected
                            ? 'opacity-100 text-lavender hover:bg-white/20'
                            : 'opacity-0 group-hover:opacity-100 text-indigo hover:bg-indigo/10',
                        ].join(' ')}
                        aria-label={tWithVars('family.editMember', 'Edit {{name}}', {
                          name: member.name,
                        })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
