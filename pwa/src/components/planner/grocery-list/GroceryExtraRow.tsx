import React, { useCallback } from 'react';
import { Check, CheckCircle2, Circle, Edit3, Tag, Trash2 } from 'lucide-react';
import type { GroceryExtraDto } from '@/lib/api/generated/models';
import { cn } from '@/lib/utils';
import { t } from '@/locales';
import {
  CATEGORY_BUTTON_CLASS,
  type CheckControlInfo,
  type ExtraMutationChange,
  type PreserveCheckFocusFn,
} from './helpers';
import { ExtraSectionPicker } from './SectionPicker';

interface GroceryExtraRowProps {
  extra: GroceryExtraDto;
  pending: boolean;
  error: boolean;
  editing: boolean;
  editingName: string;
  isSectionPickerOpen: boolean;
  onEditingNameChange: (value: string) => void;
  onStartEdit: (id: string, currentName: string) => void;
  onMutateExtra: (
    extra: GroceryExtraDto,
    change: ExtraMutationChange,
    checkControl?: CheckControlInfo
  ) => void;
  onDeleteExtra: (extra: GroceryExtraDto) => void;
  onToggleSectionPicker: (id: string) => void;
  onCloseSectionPicker: () => void;
  preserveCheckFocus: PreserveCheckFocusFn;
  registerEditButton: (id: string, node: HTMLButtonElement | null) => void;
}

export function GroceryExtraRow({
  extra,
  pending,
  error,
  editing,
  editingName,
  isSectionPickerOpen,
  onEditingNameChange,
  onStartEdit,
  onMutateExtra,
  onDeleteExtra,
  onToggleSectionPicker,
  onCloseSectionPicker,
  preserveCheckFocus,
  registerEditButton,
}: GroceryExtraRowProps) {
  const id = extra.id ?? '';
  const editable = extra.readOnly !== true;
  const handleEditButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      registerEditButton(id, node);
    },
    [id, registerEditButton]
  );

  return (
    <div className="relative py-2" data-testid="grocery-extra-row" data-extra-id={id}>
      {editing ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`extra-name-${id}`}>
            {t('grocery.editExtraName', 'Extra name')}
          </label>
          <input
            id={`extra-name-${id}`}
            value={editingName}
            onChange={(event) => onEditingNameChange(event.target.value)}
            className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-garden-line bg-white px-3 text-ink-body focus:outline-none focus:ring-2 focus:ring-garden-ink"
            autoFocus
          />
          <button
            type="button"
            className="h-11 w-11 shrink-0 rounded-full bg-garden-fill hover:bg-garden-fill-deep text-white focus:outline-none focus:ring-2 focus:ring-ink-body disabled:opacity-50"
            disabled={!editingName.trim() || pending}
            onClick={() => onMutateExtra(extra, { name: editingName.trim() })}
            aria-label={t('grocery.save', 'Save')}
          >
            <Check className="mx-auto" size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="h-11 w-11 shrink-0 rounded-full text-hearth-ink focus:outline-none focus:ring-2 focus:ring-hearth-ink disabled:opacity-50"
            onClick={() => onDeleteExtra(extra)}
            disabled={pending}
            aria-label={t('grocery.delete', 'Delete')}
          >
            <Trash2 className="mx-auto" size={20} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex min-h-12 items-center gap-3 rounded-2xl px-2">
          {editable ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={extra.checked === true}
              aria-label={`${extra.checked ? t('grocery.uncheck', 'Uncheck') : t('grocery.check', 'Check')} ${extra.name ?? ''}`}
              aria-disabled={pending}
              onClick={(event) => {
                if (pending) return;
                const control = { element: event.currentTarget, keyboard: event.detail === 0 };
                preserveCheckFocus(control.element, control.keyboard);
                onMutateExtra(extra, { checked: extra.checked !== true }, control);
              }}
              className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-garden-ink"
              data-testid="grocery-extra-checkbox"
            >
              {extra.checked ? (
                <CheckCircle2 className="shrink-0 text-garden-ink" size={20} />
              ) : (
                <Circle className="shrink-0 text-icon-affordance" size={20} />
              )}
              <span className={cn('min-w-0 flex-1', extra.checked && 'line-through opacity-60')}>
                <span className="block font-medium text-ink-body" data-testid="grocery-extra-name">
                  {extra.name}
                </span>
                <span className="text-xs font-bold text-sunlight-ink">
                  {t('grocery.extra', 'Extra')}
                </span>
              </span>
            </button>
          ) : (
            <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3">
              {extra.checked ? (
                <CheckCircle2 className="shrink-0 text-garden-ink" size={20} aria-hidden="true" />
              ) : (
                <Circle className="shrink-0 text-icon-affordance" size={20} aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink-body" data-testid="grocery-extra-name">
                  {extra.name}
                </span>
                <span className="text-xs font-bold text-sunlight-ink">
                  {t('grocery.extra', 'Extra')}
                </span>
                <span className="ml-2 text-xs font-bold text-ink-muted">
                  {extra.checked
                    ? t('grocery.bought', 'Bought')
                    : t('grocery.notBought', 'Not bought')}
                </span>
              </span>
            </div>
          )}
          {editable && (
            <>
              <button
                type="button"
                className={CATEGORY_BUTTON_CLASS}
                aria-label={`${t('grocery.changeSection', 'Change section for')} ${extra.name ?? ''}`}
                aria-expanded={isSectionPickerOpen}
                onClick={() => onToggleSectionPicker(id)}
              >
                <Tag size={16} className="mx-auto" aria-hidden="true" />
              </button>
              <button
                type="button"
                ref={handleEditButtonRef}
                className="min-h-11 min-w-11 rounded-full text-icon-affordance hover:text-ink-body focus:ring-2 focus:ring-garden-ink"
                aria-label={`${t('grocery.edit', 'Edit')} ${extra.name ?? ''}`}
                onClick={() => onStartEdit(id, extra.name ?? '')}
              >
                <Edit3 size={16} className="mx-auto" />
              </button>
            </>
          )}
        </div>
      )}
      {isSectionPickerOpen && editable && (
        <ExtraSectionPicker
          extra={extra}
          pending={pending}
          onClosePicker={onCloseSectionPicker}
          onSelectSection={(nextSection) => onMutateExtra(extra, { grocerySection: nextSection })}
        />
      )}
      {(pending || error) && (
        <p className="px-3 text-xs font-bold" role={error ? 'alert' : 'status'}>
          {pending
            ? t('grocery.savingExtra', 'Saving…')
            : t('grocery.extraSaveError', 'Could not save. Refreshing; try again.')}
        </p>
      )}
    </div>
  );
}
