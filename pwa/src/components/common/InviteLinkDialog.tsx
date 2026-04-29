'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Share2, X } from 'lucide-react';

interface InviteLinkDialogProps {
  memberId: string;
  memberName: string;
  onClose: () => void;
}

export function InviteLinkDialog({ memberId, memberName, onClose }: InviteLinkDialogProps) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/auth/invite-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
      .then((r) => r.json())
      .then((data: { link?: string }) => {
        if (data.link) setLink(data.link);
      })
      .catch(() => {});
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl flex flex-col gap-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-charcoal">Invite {memberName}</h2>
              <p className="text-xs text-charcoal/50 mt-0.5">Share this link with your family</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-charcoal/5 text-charcoal/40 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="rounded-xl bg-cream border border-charcoal/10 px-4 py-3 text-xs font-mono text-charcoal/60 break-all select-all">
            {link || 'Generating link…'}
          </div>

          {copied && (
            <p className="text-xs text-sage font-medium text-center -mt-2">Link copied!</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              disabled={!link}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-charcoal/5 text-charcoal text-sm font-semibold transition-all active:scale-95 hover:bg-charcoal/10 disabled:opacity-40"
            >
              <Copy size={16} />
              Copy
            </button>
            {canShare && (
              <button
                onClick={handleShare}
                disabled={!link}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-ochre text-white text-sm font-semibold shadow-lg shadow-ochre/30 transition-all active:scale-95 hover:brightness-110 disabled:opacity-40"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
