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
  const [error, setError] = useState('');
  const emoji = getEmojiForName(name);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }

    setError('');
    await onSubmit(trimmed);
    setName('');
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
      <Button type="submit" isLoading={isLoading} fullWidth data-hint="save-member">
        Add Member
      </Button>
    </form>
  );
}
