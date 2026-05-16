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
        <ul className="flex flex-col gap-2" aria-label="Family members">
          {members.map((member) => {
            const selected = String(member.id).toLowerCase() === String(selectedId).toLowerCase();
            const isEditing = editingId === member.id;

            return (
              <li key={member.id}>
                {isEditing ? (
                  <div className="flex w-full items-center gap-2 rounded-2xl bg-white p-2 shadow-card ring-2 ring-terracotta/20">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-testid={`family-member-edit-input-${member.id}`}
                      aria-label={tWithVars('family.editNameFor', 'Edit name for {name}', {
                        name: member.name,
                      })}
                      className="flex-1 rounded-xl bg-terracotta/5 px-3 py-2 text-sm font-medium text-charcoal focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(member.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdate(member.id)}
                      disabled={isLoading || !editName.trim()}
                      data-testid={`family-member-save-${member.id}`}
                      className="rounded-full p-2 text-terracotta hover:bg-terracotta/10 disabled:opacity-30"
                      aria-label={t('family.saveName', 'Save name')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isLoading}
                      data-testid={`family-member-cancel-${member.id}`}
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
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98]',
                        'focus:outline-none focus:ring-2 focus:ring-terracotta/40',
                        selected
                          ? `bg-terracotta text-white shadow-card ${onInvite ? 'pr-36' : 'pr-24'}`
                          : `bg-white/40 backdrop-blur-xl border border-white/60 text-charcoal shadow-glass hover:bg-white/60 ${onInvite ? 'pr-28' : 'pr-12'}`,
                      ].join(' ')}
                    >
                      <span className="font-medium truncate">{member.name}</span>
                      {selected && (
                        <>
                          <span className="ml-auto text-xs font-semibold text-white/80">
                            {t('family.selected', 'you')}
                          </span>
                          <span className="sr-only">Selected family member</span>
                        </>
                      )}
                    </button>

                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {onInvite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInvite(member.id, member.name);
                          }}
                          data-testid={`family-member-invite-${member.id}`}
                          className={[
                            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm',
                            selected
                              ? 'bg-white/20 text-white hover:bg-white/30 ring-1 ring-white/30'
                              : 'bg-terracotta/10 text-terracotta hover:bg-terracotta/20 ring-1 ring-terracotta/20',
                          ].join(' ')}
                        >
                          <Share2 className="h-3 w-3" />
                          {t('profile.invite', 'Invite')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(member);
                        }}
                        data-testid={`family-member-edit-${member.id}`}
                        className={[
                          'rounded-full p-2.5 transition-all',
                          selected
                            ? 'opacity-100 text-white hover:bg-white/20'
                            : 'opacity-40 hover:opacity-100 text-terracotta hover:bg-terracotta/10',
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
