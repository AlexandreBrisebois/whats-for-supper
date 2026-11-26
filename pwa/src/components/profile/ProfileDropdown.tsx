'use client';

import { useState, useRef, useId } from 'react';
import { ChevronDown, UserCircle } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { MemberPickerList } from '@/components/identity/MemberPickerList';
import { t } from '@/locales';

interface ProfileDropdownProps {
  onSelect: (id: string) => void;
}

export function ProfileDropdown({ onSelect }: ProfileDropdownProps) {
  const { familyMembers, selectedMember, isLoading } = useFamily();
  const [isOpen, setIsOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const choicesId = useId();

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-24 w-full items-center rounded-3xl bg-white border border-chrome-line p-5 shadow-[0_8px_28px_-8px_rgba(31,41,55,0.16)]"
      >
        <span className="text-sm text-ink-muted">
          {t('profile.loading', 'Loading family members…')}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-controls={choicesId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="profile-dropdown-toggle"
        className="flex w-full items-center justify-between gap-4 min-h-24 rounded-3xl bg-white border border-chrome-line p-[20px] shadow-[0_8px_28px_-8px_rgba(31,41,55,0.16)] hover:bg-terracotta-50 active:bg-terracotta-100 scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-hearth-ink"
        aria-label={
          isOpen
            ? t('profile.closeMemberMenu', 'Close member menu')
            : t('profile.openMemberMenu', 'Open member menu')
        }
      >
        <div className="flex min-w-0 items-center gap-[12px]">
          <div className="hidden h-[48px] w-[48px] shrink-0 min-[380px]:flex items-center justify-center rounded-full bg-terracotta-50 text-hearth-ink">
            <UserCircle aria-hidden="true" className="h-7 w-7" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-ink-muted">
              {t('profile.activeMember', 'Active member')}
            </p>
            <p
              data-testid="selected-member-name"
              className="break-words font-outfit text-2xl font-bold text-ink-body leading-tight"
            >
              {selectedMember?.name || t('profile.selectMember', 'Select member')}
            </p>
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-hearth-ink transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="relative z-10 mt-3 w-full">
          <MemberPickerList
            id={choicesId}
            ariaLabel={t('profile.activeMember', 'Active member')}
            members={familyMembers ?? []}
            selectedMemberId={selectedMember?.id}
            onSelect={(member) => {
              onSelect(member.id);
              setIsOpen(false);
            }}
            onDismiss={() => setIsOpen(false)}
            outsideClickIgnoreRef={triggerRef}
            returnFocusRef={triggerRef}
            listTestId="profile-dropdown-menu"
            getOptionTestId={(member) => `profile-dropdown-option-${member.id}`}
          />
        </div>
      )}
    </div>
  );
}
