'use client';

import { useState, type FormEvent } from 'react';

import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/ui/button';

const EMOJIS = ['🧑', '👩', '👨', '🧒', '👧', '👦', '🧓', '👴', '👵'];

function getEmojiForName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '🧑';
  const index = trimmed.charCodeAt(0) % EMOJIS.length;
  return EMOJIS[index] ?? '🧑';
}

interface AddFamilyMemberFormProps {
  onSubmit: (name: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function AddFamilyMemberForm({ onSubmit, isLoading = false }: AddFamilyMemberFormProps) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [error, setError] = useState('');
  const defaultEmoji = getEmojiForName(name);
  const emoji = selectedEmoji || defaultEmoji;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }

    setError('');
    // Store selected emoji in sessionStorage temporarily to pass to store
    if (selectedEmoji) {
      sessionStorage.setItem('selectedEmoji', selectedEmoji);
    }
    await onSubmit(trimmed);
    setName('');
    setSelectedEmoji(null);
    sessionStorage.removeItem('selectedEmoji');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FormInput
            label="Name"
            value={name}
            onChange={(v) => {
              setName(v);
              if (error) setError('');
            }}
            placeholder="e.g. Alex"
            error={error}
            disabled={isLoading}
            autoComplete="given-name"
            data-hint="member-name-input"
          />
        </div>
        <div className="mb-2 text-4xl">{emoji}</div>
      </div>

      <div>
        <label className="text-xs font-medium text-charcoal-600">Choose an emoji (optional)</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setSelectedEmoji(e === selectedEmoji ? null : e)}
              disabled={isLoading}
              className={[
                'text-2xl p-2 rounded-lg transition-all',
                selectedEmoji === e
                  ? 'bg-sage-green ring-2 ring-sage-green'
                  : 'bg-white hover:bg-sage-green/10',
                isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              aria-pressed={selectedEmoji === e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" isLoading={isLoading} fullWidth data-hint="save-member">
        Add Member
      </Button>
    </form>
  );
}
