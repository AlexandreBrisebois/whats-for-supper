'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, X } from 'lucide-react';

import { getInviteLink } from '@/lib/auth';

interface InviteLinkDialogProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
}

export function InviteLinkDialog({ memberId, memberName, onClose }: InviteLinkDialogProps) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const baseUrl = window.location.origin;
    getInviteLink(baseUrl, memberId).then((newLink) => {
      if (newLink) setLink(newLink);
    });
  }, [memberId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: "Join our family on What's For Supper",
        text: `${memberName} invited you to help plan meals!`,
        url: link,
      });
    } catch {
      // user cancelled or unsupported
    }
  };

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="invite-dialog-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/45 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Invite ${memberName}`}
          data-testid="invite-dialog"
          className="w-full max-w-sm rounded-[2rem] border border-charcoal-200 bg-cream p-6 shadow-2xl flex flex-col gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-heading text-lg font-bold text-charcoal">Invite {memberName}</h2>
              <p className="text-xs text-charcoal-600 mt-0.5">Share this link with your family</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="invite-dialog-close"
              aria-label="Close invite dialog"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full hover:bg-charcoal-100 text-charcoal-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-charcoal"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div
            data-testid="invite-dialog-link"
            className="rounded-xl bg-white border border-charcoal-200 px-4 py-3 text-xs font-mono text-charcoal-700 break-all select-all"
          >
            {link || 'Generating link…'}
          </div>

          {copied && (
            <p className="text-xs text-sage-700 font-medium text-center -mt-2">Link copied!</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!link}
              data-testid="invite-dialog-copy"
              className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-2xl border border-charcoal-200 bg-white text-charcoal text-sm font-semibold transition-all active:scale-95 hover:bg-charcoal-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
            >
              <Copy size={16} aria-hidden="true" />
              Copy
            </button>
            {canShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={!link}
                data-testid="invite-dialog-share"
                className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-2xl bg-terracotta text-cream-100 text-sm font-semibold shadow-sm transition-all active:scale-95 hover:bg-terracotta-600 active:bg-terracotta-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-charcoal"
              >
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
