'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Smartphone } from 'lucide-react';
import { MemberPickerList, type MemberPickerMember } from '@/components/identity/MemberPickerList';
import { t, tWithVars } from '@/locales';

interface PassThePhoneProps {
  currentMember: MemberPickerMember;
  otherMembers: MemberPickerMember[];
  onConfirmHandoff: (targetMember: MemberPickerMember) => Promise<void>;
  pendingTarget?: MemberPickerMember | null;
  onSelectTarget?: (targetMember: MemberPickerMember) => void;
  onCancelTarget?: () => void;
  hideTrigger?: boolean;
}

export function PassThePhone({
  currentMember,
  otherMembers,
  onConfirmHandoff,
  pendingTarget,
  onSelectTarget,
  onCancelTarget,
  hideTrigger = false,
}: PassThePhoneProps) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [internalTarget, setInternalTarget] = useState<MemberPickerMember | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchFailed, setSwitchFailed] = useState(false);

  const isControlled = pendingTarget !== undefined;
  const activeTarget = isControlled ? pendingTarget : internalTarget;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const choicesId = useId();
  const curtainHeadingId = useId();

  useEffect(() => {
    if (activeTarget) {
      confirmBtnRef.current?.focus();
    }
  }, [activeTarget]);

  if (otherMembers.length === 0 && !activeTarget) {
    return null;
  }

  const handleConfirm = async () => {
    if (!activeTarget || isSwitching) return;
    setIsSwitching(true);
    setSwitchFailed(false);
    try {
      await onConfirmHandoff(activeTarget);
      if (!isControlled) {
        setInternalTarget(null);
      }
    } catch {
      setSwitchFailed(true);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleCancelCurtain = () => {
    if (isSwitching) return;
    setSwitchFailed(false);
    if (onCancelTarget) {
      onCancelTarget();
    } else {
      setInternalTarget(null);
    }
    triggerRef.current?.focus();
  };

  const curtain = activeTarget ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={curtainHeadingId}
      data-testid="discovery-handoff-curtain"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !isSwitching) {
          event.preventDefault();
          handleCancelCurtain();
          return;
        }
        if (event.key === 'Tab') {
          const focusables = [confirmBtnRef.current, cancelBtnRef.current].filter(
            (el): el is HTMLButtonElement => Boolean(el && !el.disabled)
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-cream px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="flex w-full max-w-sm min-w-0 flex-col items-center gap-6 rounded-[2.5rem] border border-chrome-line bg-white p-5 text-center shadow-card sm:p-8">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-sunlight-line bg-ochre-100 text-sunlight-ink">
          <Smartphone size={32} aria-hidden="true" />
        </div>

        <h2
          id={curtainHeadingId}
          className="max-w-full break-words font-heading text-2xl font-extrabold leading-tight text-ink-body sm:text-3xl"
        >
          {tWithVars('discovery.passThePhone.curtainHeading', 'Hand the phone to {{name}}', {
            name: activeTarget.name,
          })}
        </h2>

        {switchFailed && (
          <div
            role="alert"
            data-testid="discovery-handoff-error"
            className="w-full min-w-0 break-words rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-left text-sm text-hearth-ink"
          >
            <p className="font-bold">
              {tWithVars(
                'discovery.passThePhone.switchError',
                "Couldn't switch to {{name}} just now.",
                { name: activeTarget.name }
              )}
            </p>
            <p className="mt-0.5">
              {tWithVars('discovery.passThePhone.stillSelected', '{{name}} is still selected.', {
                name: currentMember.name,
              })}
            </p>
          </div>
        )}

        <div className="flex w-full min-w-0 flex-col gap-3">
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={isSwitching}
            aria-busy={isSwitching}
            data-testid="discovery-handoff-confirm"
            onClick={() => void handleConfirm()}
            className="min-h-14 w-full min-w-0 break-words rounded-full bg-hearth-fill px-4 py-3.5 text-base font-bold text-cream-100 shadow-sm transition-colors hover:bg-hearth-fill-hover active:bg-hearth-fill-active disabled:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body sm:px-6"
          >
            {isSwitching
              ? tWithVars('discovery.passThePhone.curtainBusy', "Getting {{name}}'s cards ready…", {
                  name: activeTarget.name,
                })
              : switchFailed
                ? t('discovery.passThePhone.tryAgain', 'Try again')
                : tWithVars('discovery.passThePhone.curtainConfirm', "Let's go, {{name}}!", {
                    name: activeTarget.name,
                  })}
          </button>

          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isSwitching}
            data-testid="discovery-handoff-cancel"
            onClick={handleCancelCurtain}
            className="min-h-12 w-full min-w-0 break-words rounded-full border border-chrome-line bg-white px-4 py-3 text-sm font-semibold text-ink-body transition-colors hover:bg-charcoal-50 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body sm:px-6"
          >
            {t('discovery.passThePhone.curtainCancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="w-full">
      {!hideTrigger && (
        <>
          <button
            ref={triggerRef}
            type="button"
            data-testid="discovery-pass-the-phone"
            aria-expanded={chooserOpen}
            aria-controls={choicesId}
            onClick={() => setChooserOpen((open) => !open)}
            className="flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-garden-line bg-sage-50 px-4 py-3 font-semibold text-garden-ink transition-colors hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body sm:px-6"
          >
            <span className="min-w-0 break-words">
              {t('discovery.passThePhone.trigger', 'Pass the phone')}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${
                chooserOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {chooserOpen && (
            <div className="mt-2 w-full text-left">
              <MemberPickerList
                id={choicesId}
                ariaLabel={t('discovery.passThePhone.chooseMemberLabel', 'Choose who votes next')}
                members={otherMembers}
                onSelect={(member) => {
                  setChooserOpen(false);
                  setSwitchFailed(false);
                  if (onSelectTarget) {
                    onSelectTarget(member);
                  } else {
                    setInternalTarget(member);
                  }
                }}
                onDismiss={() => setChooserOpen(false)}
                outsideClickIgnoreRef={triggerRef}
                returnFocusRef={triggerRef}
                listTestId="discovery-pass-the-phone-menu"
                getOptionTestId={(member) => `pass-the-phone-option-${member.id}`}
              />
            </div>
          )}
        </>
      )}

      {curtain &&
        (typeof document !== 'undefined' ? createPortal(curtain, document.body) : curtain)}
    </div>
  );
}
