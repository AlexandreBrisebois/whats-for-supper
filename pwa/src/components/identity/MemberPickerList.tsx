'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { Check } from 'lucide-react';
import { t } from '@/locales';

export interface MemberPickerMember {
  id: string;
  name: string;
}

interface MemberPickerListProps<T extends MemberPickerMember> {
  id: string;
  ariaLabel: string;
  members: T[];
  selectedMemberId?: string | null;
  onSelect: (member: T) => void;
  onDismiss?: () => void;
  outsideClickIgnoreRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  listTestId?: string;
  getOptionTestId?: (member: T) => string;
  className?: string;
}

export function MemberPickerList<T extends MemberPickerMember>({
  id,
  ariaLabel,
  members,
  selectedMemberId,
  onSelect,
  onDismiss,
  outsideClickIgnoreRef,
  returnFocusRef,
  listTestId,
  getOptionTestId,
  className = '',
}: MemberPickerListProps<T>) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!onDismiss) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (listRef.current?.contains(target)) return;
      if (outsideClickIgnoreRef?.current?.contains(target)) return;
      onDismiss?.();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss, outsideClickIgnoreRef]);

  return (
    <ul
      ref={listRef}
      id={id}
      aria-label={ariaLabel}
      data-testid={listTestId}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onDismiss) {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
          returnFocusRef?.current?.focus();
        }
      }}
      className={[
        'max-h-[min(60dvh,24rem)] overflow-y-auto overscroll-contain scroll-py-2 rounded-3xl bg-white border border-chrome-line shadow-card p-2 flex flex-col gap-1',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {members.map((member) => {
        const isSelected =
          Boolean(selectedMemberId) &&
          String(member.id).toLowerCase() === String(selectedMemberId).toLowerCase();

        return (
          <li key={member.id}>
            <button
              aria-current={isSelected ? 'true' : undefined}
              type="button"
              onClick={() => onSelect(member)}
              data-testid={getOptionTestId?.(member)}
              className={`flex min-h-12 w-full items-center justify-between gap-3 px-3 py-3 rounded-2xl text-left scroll-mb-[calc(8rem+env(safe-area-inset-bottom))] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-ink-body ${
                isSelected ? 'bg-terracotta-50 text-hearth-ink' : 'text-ink-body hover:bg-cream'
              }`}
            >
              <span className="min-w-0 break-words font-inter font-semibold">{member.name}</span>
              {isSelected && (
                <>
                  <span className="sr-only">
                    {t('profile.currentMember', 'Current family member')}
                  </span>
                  <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-hearth-ink" />
                </>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
