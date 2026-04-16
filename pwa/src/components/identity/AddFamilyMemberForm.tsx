'use client';

import { useState, type FormEvent } from 'react';

import { FormInput } from '@/components/common/FormInput';
import { Button } from '@/components/ui/button';
import { t } from '@/locales';

interface AddFamilyMemberFormProps {
  onSubmit: (name: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function AddFamilyMemberForm({ onSubmit, isLoading = false }: AddFamilyMemberFormProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError(t('family.nameError', 'Please enter a name.'));
      return;
    }

    setError('');
    await onSubmit(trimmed);
    setName('');
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormInput
        label={t('family.nameLabel', 'Name')}
        value={name}
        onChange={(v) => {
          setName(v);
          if (error) setError('');
        }}
        placeholder={t('family.namePlaceholder', 'e.g. Alex')}
        error={error}
        disabled={isLoading}
        autoComplete="given-name"
      />

      <Button type="submit" isLoading={isLoading} fullWidth>
        {t('family.addMemberButton', 'Add Member')}
      </Button>
    </form>
  );
}
