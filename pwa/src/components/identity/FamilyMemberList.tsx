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
        <p className="py-6 text-center text-sm text-ink-muted">
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
                  <div className="flex w-full items-center gap-2 rounded-2xl bg-white border border-hearth-line p-2 shadow-card ring-2 ring-hearth-line">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      data-testid={`family-member-edit-input-${member.id}`}
                      aria-label={tWithVars('family.editNameFor', 'Edit name for {name}', {
                        name: member.name,
                      })}
                      className="min-w-0 min-h-12 flex-1 rounded-xl bg-terracotta-50 px-3 py-2 text-sm font-medium text-ink-body focus:outline-none"
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
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-hearth-ink hover:bg-terracotta-50 disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-hearth-ink"
                      aria-label={t('family.saveName', 'Save name')}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={isLoading}
                      data-testid={`family-member-cancel-${member.id}`}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-charcoal-100 focus-visible:outline-2 focus-visible:outline-ink-body"
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
                        'flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.98]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body',
                        selected
                          ? `bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active text-white shadow-card ${onInvite ? 'pr-40' : 'pr-16'}`
                          : `bg-white border border-chrome-line text-ink-body shadow-card hover:bg-cream-100 ${onInvite ? 'pr-36' : 'pr-16'}`,
                      ].join(' ')}
                    >
                      <span className="min-w-0 font-medium truncate" title={member.name}>
                        {member.name}
                      </span>
                      {selected && (
                        <>
                          <span className="ml-auto shrink-0 text-xs font-semibold text-cream-100">
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
                          aria-label={t('profile.invite', 'Invite')}
                          className={[
                            'flex min-h-12 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all shadow-sm focus-visible:outline-2 focus-visible:outline-hearth-ink',
                            selected
                              ? 'bg-white text-hearth-ink hover:bg-cream-100'
                              : 'bg-terracotta-50 text-hearth-ink hover:bg-white hover:border-hearth-ink border border-hearth-line',
                          ].join(' ')}
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>{t('profile.invite', 'Invite')}</span>
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
                          'flex h-12 w-12 items-center justify-center rounded-full transition-all focus-visible:outline-2 focus-visible:outline-ink-body',
                          selected
                            ? 'text-white hover:bg-white/20'
                            : 'text-hearth-ink hover:bg-terracotta-50',
                        ].join(' ')}
                        aria-label={tWithVars('family.editMember', 'Edit {{name}}', {
                          name: member.name,
                        })}
                      >
                        <Pencil className="h-4 w-4" />
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
