'use client';

import { useState, useRef, useEffect } from 'react';
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
      <div className="w-full h-16 animate-pulse rounded-2xl bg-white/20 border border-white/20" />
    );
  }

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="profile-dropdown-toggle"
        className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/60 p-5 shadow-glass hover:bg-white/50 transition-all active:scale-[0.98]"
        aria-label={
          isOpen
            ? t('profile.closeMemberMenu', 'Close member menu')
            : t('profile.openMemberMenu', 'Open member menu')
        }
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
            <UserCircle className="h-7 w-7" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-terracotta/60">
              {t('profile.activeMember', 'Active Member')}
            </p>
            <p className="font-outfit text-xl font-bold text-charcoal leading-tight">
              {selectedMember?.name || t('profile.selectMember', 'Select Member')}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-terracotta/40 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-4 w-full animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300">
          <ul
            data-testid="profile-dropdown-menu"
            className="overflow-hidden rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/80 shadow-2xl p-2 flex flex-col gap-1"
          >
            {familyMembers?.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(member.id)}
                  data-testid={`profile-dropdown-option-${member.id}`}
                  className={`flex w-full items-center justify-between px-5 py-4 rounded-2xl text-left transition-all duration-200 ${
                    String(member.id).toLowerCase() === String(selectedMember?.id).toLowerCase()
                      ? 'bg-terracotta/10 text-terracotta'
                      : 'text-charcoal hover:bg-cream'
                  }`}
                >
                  <span className="font-inter font-semibold">{member.name}</span>
                  {String(member.id).toLowerCase() === String(selectedMember?.id).toLowerCase() && (
                    <>
                      <span className="sr-only">Current family member</span>
                      <Check className="h-5 w-5 text-terracotta" />
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
