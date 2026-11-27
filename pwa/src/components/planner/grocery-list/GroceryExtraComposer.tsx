import React from 'react';
import { LoaderCircle, Plus } from 'lucide-react';
import { t, tWithVars } from '@/locales';

interface GroceryExtraComposerProps {
  extraName: string;
  suggestions: string[];
  suggestionsOpen: boolean;
  activeSuggestion: number;
  addState: 'idle' | 'pending' | 'error';
  suggestionError: boolean;
  setComposerContainerNode: (node: HTMLDivElement | null) => void;
  setComposerInputNode: (node: HTMLInputElement | null) => void;
  onFocusCapture: () => void;
  onBlurCapture: (event: React.FocusEvent<HTMLDivElement>) => void;
  onExtraNameChange: (value: string) => void;
  onInputFocus: () => void;
  onInputKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectSuggestion: (suggestion: string) => void;
  onSubmitExtra: () => void;
}

export function GroceryExtraComposer({
  extraName,
  suggestions,
  suggestionsOpen,
  activeSuggestion,
  addState,
  suggestionError,
  setComposerContainerNode,
  setComposerInputNode,
  onFocusCapture,
  onBlurCapture,
  onExtraNameChange,
  onInputFocus,
  onInputKeyDown,
  onSelectSuggestion,
  onSubmitExtra,
}: GroceryExtraComposerProps) {
  return (
    <div
      ref={setComposerContainerNode}
      className="relative border-t border-chrome-line bg-cream p-3"
      data-testid="grocery-extra-composer"
      onFocusCapture={onFocusCapture}
      onBlurCapture={onBlurCapture}
    >
      {suggestionsOpen && (
        <ul
          id="grocery-extra-suggestions"
          role="listbox"
          aria-label={t('grocery.extraSuggestions', 'Extra suggestions')}
          className="absolute bottom-full left-3 right-3 z-20 mb-2 max-h-40 overflow-auto rounded-2xl border border-chrome-line bg-white p-1 shadow-xl"
        >
          {suggestions.map((suggestion, index) => (
            <li
              id={`grocery-extra-option-${index}`}
              key={suggestion}
              role="option"
              aria-selected={activeSuggestion === index}
            >
              <button
                type="button"
                className="min-h-11 w-full rounded-xl px-3 text-left text-ink-body focus:bg-sage/10 focus:outline-none"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {suggestionsOpen
          ? tWithVars(
              suggestions.length === 1
                ? 'grocery.suggestionCountOne'
                : 'grocery.suggestionCountMany',
              suggestions.length === 1
                ? '{{count}} suggestion available'
                : '{{count}} suggestions available',
              { count: suggestions.length }
            )
          : ''}
      </p>
      <form
        className="mx-auto flex max-w-2xl items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitExtra();
        }}
      >
        <label htmlFor="grocery-extra-name" className="sr-only">
          {t('grocery.addExtraLabel', 'Add an extra')}
        </label>
        <input
          ref={setComposerInputNode}
          id="grocery-extra-name"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="grocery-extra-suggestions"
          aria-expanded={suggestionsOpen}
          aria-activedescendant={
            suggestionsOpen && activeSuggestion >= 0
              ? `grocery-extra-option-${activeSuggestion}`
              : undefined
          }
          value={extraName}
          onChange={(event) => onExtraNameChange(event.target.value)}
          onFocus={onInputFocus}
          onKeyDown={onInputKeyDown}
          placeholder={t('grocery.extraPlaceholder', 'Add milk, coffee, foil…')}
          className="min-h-12 min-w-0 flex-1 rounded-2xl border border-chrome-line bg-white px-4 text-ink-body focus:outline-none focus:ring-2 focus:ring-garden-ink"
        />
        <button
          type="submit"
          disabled={!extraName.trim() || addState === 'pending'}
          onPointerDown={(event) => event.preventDefault()}
          className="h-12 w-12 shrink-0 rounded-2xl bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active text-white disabled:opacity-50 focus:ring-2 focus:ring-ink-body"
          aria-label={
            addState === 'pending'
              ? t('grocery.addingExtra', 'Adding…')
              : t('grocery.addExtra', 'Add')
          }
          aria-busy={addState === 'pending'}
        >
          {addState === 'pending' ? (
            <LoaderCircle className="mx-auto animate-spin" size={20} aria-hidden="true" />
          ) : (
            <Plus className="mx-auto" size={20} aria-hidden="true" />
          )}
        </button>
      </form>
      {(addState === 'error' || suggestionError) && (
        <p className="mx-auto mt-1 max-w-2xl text-xs font-bold text-hearth-ink" role="alert">
          {addState === 'error'
            ? t(
                'grocery.addExtraError',
                'Could not add this extra. Your text is still here; try again.'
              )
            : t(
                'grocery.suggestionError',
                'Suggestions are unavailable. You can still add your own text.'
              )}
        </p>
      )}
      {addState === 'pending' && (
        <p className="sr-only" role="status">
          {t('grocery.addingExtra', 'Adding…')}
        </p>
      )}
    </div>
  );
}
