'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Share2, X } from 'lucide-react';
import { getVotingLink } from '@/lib/auth';
import { t } from '@/locales';

export function FamilyNudgeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <FamilyNudgeContent onClose={onClose} />}</AnimatePresence>;
}

function FamilyNudgeContent({ onClose }: { onClose: () => void }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    let active = true;
    const trigger = document.activeElement as HTMLElement | null;
    const baseUrl = window.location.origin;
    void getVotingLink(baseUrl)
      .then((link) => {
        if (active) setShareUrl(link || `${baseUrl}/discovery`);
      })
      .catch(() => {
        if (active) setShareUrl(`${baseUrl}/discovery`);
      });
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = [
        ...(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []),
      ];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      active = false;
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [onClose]);

  const handleCopyVotingLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  const handleShareVotingLink = async () => {
    if (!navigator.share || !shareUrl) return;
    try {
      await navigator.share({
        title: "What's for Supper?",
        text: "Help us choose what's for supper! Vote here:",
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  return (
    <motion.div
      key="planner-nudge-dialog-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-charcoal/40 px-4 backdrop-blur-sm"
      onClick={() => onClose()}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Nudge the family"
        data-testid="planner-nudge-dialog"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex w-full max-w-sm flex-col gap-5 rounded-[2rem] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-charcoal">Nudge the family</h2>
            <p className="mt-0.5 text-xs text-charcoal/50">Share this week&apos;s voting link</p>
          </div>
          <button
            onClick={() => onClose()}
            data-testid="planner-nudge-close"
            className="rounded-full p-2 text-charcoal/40 transition-colors hover:bg-charcoal/5"
            aria-label={t('common.close', 'Close')}
            title={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>

        <div
          data-testid="planner-nudge-link"
          className="select-all break-all rounded-xl border border-charcoal/10 bg-cream px-4 py-3 font-mono text-xs text-charcoal/60"
        >
          {shareUrl || 'Generating link...'}
        </div>

        {copied && (
          <p
            data-testid="planner-nudge-copied-feedback"
            className="-mt-2 text-center text-xs font-medium text-sage"
          >
            Link copied!
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCopyVotingLink}
            disabled={!shareUrl}
            data-testid="planner-nudge-copy"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-charcoal/5 text-sm font-semibold text-charcoal transition-all hover:bg-charcoal/10 active:scale-95 disabled:opacity-40"
          >
            <Copy size={16} />
            Copy
          </button>
          {canShare && (
            <button
              onClick={handleShareVotingLink}
              disabled={!shareUrl}
              data-testid="planner-nudge-share"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-ochre text-sm font-semibold text-white shadow-lg shadow-ochre/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              <Share2 size={16} />
              Share
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
