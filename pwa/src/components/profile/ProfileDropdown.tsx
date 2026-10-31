'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, UserCircle } from 'lucide-react';
import { useFamily } from '@/hooks/useFamily';
import { t } from '@/locales';

interface ProfileDropdownProps {
  onSelect: (id: string) => void;
}

export function ProfileDropdown({ onSelect }: ProfileDropdownProps) {
  const { familyMembers, selectedMember, isLoading } = useFamily();
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const choicesId = useId();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-24 w-full items-center rounded-3xl bg-white/70 p-5 shadow-[0_8px_28px_-8px_rgba(31,41,55,0.16)]"
      >
        <span className="text-sm text-charcoal-600">
          {t('profile.loading', 'Loading family members…')}
        </span>
      </div>
    );
  }

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div
      className="relative w-full"
      ref={dropdownRef}
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
        className="flex w-full items-center justify-between gap-4 min-h-24 rounded-3xl bg-white/80 border border-white p-[20px] shadow-[0_8px_28px_-8px_rgba(31,41,55,0.16)] hover:bg-terracotta-50 active:bg-terracotta-100 scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-terracotta-700"
        aria-label={
          isOpen
            ? t('profile.closeMemberMenu', 'Close member menu')
            : t('profile.openMemberMenu', 'Open member menu')
        }
      >
        <div className="flex min-w-0 items-center gap-[12px]">
          <div className="hidden h-[48px] w-[48px] shrink-0 min-[380px]:flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-700">
            <UserCircle aria-hidden="true" className="h-7 w-7" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-charcoal-600">
              {t('profile.activeMember', 'Active member')}
            </p>
            <p
              data-testid="selected-member-name"
              className="break-words font-outfit text-2xl font-bold text-charcoal leading-tight"
            >
              {selectedMember?.name || t('profile.selectMember', 'Select member')}
            </p>
          </div>
        </div>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-terracotta-700 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="relative z-10 mt-3 w-full">
          <ul
            id={choicesId}
            aria-label={t('profile.activeMember', 'Active member')}
            data-testid="profile-dropdown-menu"
            className="max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain scroll-py-2 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-2xl p-[8px] flex flex-col gap-1"
          >
            {familyMembers?.map((member) => (
              <li key={member.id}>
                <button
                  aria-current={
                    String(member.id).toLowerCase() === String(selectedMember?.id).toLowerCase()
                      ? 'true'
                      : undefined
                  }
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  data-testid={`profile-dropdown-option-${member.id}`}
                  className={`flex min-h-12 w-full items-center justify-between gap-[12px] px-[12px] py-[16px] rounded-2xl text-left scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-terracotta-700 ${
                    String(member.id).toLowerCase() === String(selectedMember?.id).toLowerCase()
                      ? 'bg-terracotta-50 text-terracotta-700'
                      : 'text-charcoal hover:bg-cream'
                  }`}
                >
                  <span className="min-w-0 break-words font-inter font-semibold">
                    {member.name}
                  </span>
                  {String(member.id).toLowerCase() === String(selectedMember?.id).toLowerCase() && (
                    <>
                      <span className="sr-only">
                        {t('profile.currentMember', 'Current family member')}
                      </span>
                      <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-terracotta-700" />
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
