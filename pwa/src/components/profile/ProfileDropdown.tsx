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
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl bg-white/40 backdrop-blur-md border border-white/40 p-4 shadow-glass hover:bg-white/50 transition-all active:scale-[0.98]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo/10 text-indigo">
            <UserCircle className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo/60">
              {t('profile.activeMember', 'Active Member')}
            </p>
            <p className="font-outfit text-lg font-bold text-charcoal leading-tight">
              {selectedMember?.name || t('profile.selectMember', 'Select Member')}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-indigo/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-3 w-full animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
          <ul
            className="overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl"
            role="listbox"
          >
            {familyMembers?.map((member) => (
              <li key={member.id} role="option" aria-selected={member.id === selectedMember?.id}>
                <button
                  onClick={() => handleSelect(member.id)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition-colors ${
                    member.id === selectedMember?.id
                      ? 'bg-indigo/5 text-indigo'
                      : 'text-charcoal hover:bg-indigo/10'
                  }`}
                >
                  <span className="font-inter font-medium">{member.name}</span>
                  {member.id === selectedMember?.id && <Check className="h-4 w-4 text-indigo" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
