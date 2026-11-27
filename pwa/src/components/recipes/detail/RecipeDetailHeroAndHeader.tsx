import {
  Camera,
  Check,
  Clock,
  ExternalLink,
  Flag,
  Images,
  RefreshCw,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { DemoAiActionGate } from '@/components/demo/DemoAiActionGate';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/imageUtils';
import { t, tWithVars } from '@/locales';
import {
  RecipeEditorMetadataFields,
  type RecipeEditorMetadataFieldsProps,
} from './RecipeEditorMetadataFields';
import type { Recipe } from '@/lib/api/recipes';

export interface RecipeDetailHeroAndHeaderProps {
  recipe: Recipe;
  isEditing: boolean;
  isScrollableStatusBanner: boolean;
  planningMessage?: string;
  messageTone: 'prepared' | 'status' | 'alert';
  failedHero: string | null;
  onFailedHero: (url: string) => void;
  readyTime: string | null;
  shareError: string | null;
  departureBlocked: boolean;
  originalButtonRef: React.RefObject<HTMLButtonElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onOpenOriginalPhotos: () => void;
  onOpenIssueReview: () => void;
  onHeroRegenerate: () => void;
  onHeroCameraClick: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFindSimilar?: (recipeId: string) => void;
  editorMetadataProps: RecipeEditorMetadataFieldsProps;
}

export function RecipeDetailHeroAndHeader({
  recipe,
  isEditing,
  isScrollableStatusBanner,
  planningMessage,
  messageTone,
  failedHero,
  onFailedHero,
  readyTime,
  shareError,
  departureBlocked,
  originalButtonRef,
  fileInputRef,
  onOpenOriginalPhotos,
  onOpenIssueReview,
  onHeroRegenerate,
  onHeroCameraClick,
  onFileChange,
  onFindSimilar,
  editorMetadataProps,
}: RecipeDetailHeroAndHeaderProps) {
  const mealTypesForDisplay = (recipe.mealTypes ?? []).filter(Boolean);

  return (
    <>
      {!isEditing && isScrollableStatusBanner && (
        <p
          role="status"
          data-testid="recipe-planning-status-banner"
          className={cn(
            'mb-4 flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium',
            messageTone === 'prepared'
              ? 'border-garden-line bg-sage-50 text-garden-ink'
              : 'border-chrome-line bg-white text-ink-body'
          )}
        >
          {messageTone === 'prepared' && (
            <Check size={16} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
          )}
          <span>{planningMessage}</span>
        </p>
      )}
      <div
        data-testid="recipe-detail-hero"
        className={`relative mb-6 overflow-hidden rounded-3xl bg-charcoal/5 ${recipe.imageUrl && failedHero !== recipe.imageUrl ? 'h-56 md:h-72' : 'h-40'}`}
      >
        {recipe.imageUrl && failedHero !== recipe.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getImageUrl(recipe.imageUrl)}
            onError={() => onFailedHero(recipe.imageUrl ?? '')}
            alt={recipe.name}
            className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <UtensilsCrossed size={40} className="text-icon-affordance" />
          </div>
        )}
        {!isEditing &&
          (recipe.imageCount > 0 ||
            Boolean(recipe.sourceType === 'url' && recipe.sourceUrl?.trim())) && (
            <button
              type="button"
              ref={originalButtonRef}
              data-testid="action-view-original"
              onClick={() => {
                if (recipe.sourceType === 'url' && recipe.sourceUrl) {
                  window.open(recipe.sourceUrl, '_blank', 'noopener,noreferrer');
                } else {
                  onOpenOriginalPhotos();
                }
              }}
              className="absolute bottom-4 right-4 inline-flex min-h-12 max-w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-cream/90 border border-chrome-line px-4 py-2 text-sm font-semibold text-ink-body shadow-sm backdrop-blur-md transition-colors hover:bg-cream active:bg-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body focus-visible:ring-2 focus-visible:ring-ink-body focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <span data-testid="view-original-icon">
                {recipe.sourceType === 'url' ? <ExternalLink size={18} /> : <Images size={18} />}
              </span>
              <span>{t('recipes.viewOriginal', 'View Original')}</span>
            </button>
          )}
        {!isEditing && readyTime && (
          <span
            data-testid="recipe-ready-in"
            className="absolute top-4 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 rounded-full bg-cream border border-chrome-line px-3 py-2 text-sm font-semibold text-ink-body shadow-sm"
          >
            <Clock size={14} aria-hidden="true" />
            {tWithVars('common.readyIn', 'Ready in {{time}}', { time: readyTime })}
          </span>
        )}
        {!isEditing &&
          recipe.importIssue &&
          (() => {
            const ready = recipe.importIssue.status === 'readyToReview';
            const accessibleLabel = ready
              ? t('recipes.importIssueReadyToReviewDescription', 'Recipe ready for review')
              : t('recipes.importIssueReportedDescription', 'Recipe reported');

            return (
              <button
                type="button"
                data-testid="detail-import-issue-trigger"
                aria-label={accessibleLabel}
                title={accessibleLabel}
                onClick={onOpenIssueReview}
                className={`absolute top-4 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink-body ${
                  ready
                    ? 'bg-sage-50 border-garden-line text-garden-ink hover:bg-sage-100'
                    : 'bg-terracotta-50 border-hearth-line text-hearth-ink hover:bg-terracotta-100'
                }`}
              >
                <span
                  data-testid={`recipe-import-issue-status-${recipe.importIssue.status}`}
                  className="inline-flex items-center justify-center"
                >
                  {ready ? (
                    <Check size={20} aria-hidden="true" />
                  ) : (
                    <Flag size={18} aria-hidden="true" />
                  )}
                </span>
              </button>
            );
          })()}
        {isEditing && (
          <DemoAiActionGate className="absolute inset-x-4 bottom-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Take a photo for hero image"
              title="Take a photo for hero image"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              data-testid="hero-action-regenerate"
              aria-label="Regenerate hero image"
              title="Regenerate hero image"
              onClick={onHeroRegenerate}
              className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
            >
              <RefreshCw size={24} />
            </button>
            <button
              type="button"
              data-testid="hero-action-camera"
              aria-label="Take a new photo"
              title="Take a new photo"
              onClick={onHeroCameraClick}
              className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
            >
              <Camera size={24} />
            </button>
          </DemoAiActionGate>
        )}
      </div>

      <div className="mb-5 flex flex-col gap-3">
        {recipe.importIssue?.reimportFailureMessage && (
          <p
            role="status"
            className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-bold text-hearth-ink"
          >
            {recipe.importIssue.reimportFailureMessage}
          </p>
        )}
        {shareError && (
          <p
            data-testid="recipe-share-error"
            className="rounded-2xl border border-hearth-line bg-terracotta-50 px-4 py-3 text-sm font-medium text-hearth-ink"
          >
            {shareError}
          </p>
        )}
        {isEditing ? (
          <RecipeEditorMetadataFields {...editorMetadataProps} />
        ) : (
          <>
            <h2
              data-testid="recipe-detail-name"
              className="break-words text-3xl font-bold leading-tight text-ink-body md:text-4xl"
            >
              {recipe.name}
            </h2>
            {(recipe.cuisineType || mealTypesForDisplay.length > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {recipe.cuisineType && (
                  <span
                    data-testid="recipe-detail-cuisine-badge"
                    className="inline-flex items-center gap-1 rounded-full bg-ochre-50 border border-sunlight-line text-sunlight-ink px-3 py-1.5 shadow-sm text-xs font-semibold"
                  >
                    {recipe.cuisineType}
                  </span>
                )}
                {mealTypesForDisplay.map((mealType) => (
                  <span
                    key={mealType}
                    data-testid={`recipe-detail-meal-type-${mealType.toLowerCase()}`}
                    className="rounded-full bg-white border border-garden-line text-garden-ink px-3 py-1 text-xs font-bold uppercase"
                  >
                    {mealType}
                  </span>
                ))}
              </div>
            )}
            {recipe.description && (
              <p className="text-sm leading-6 text-ink-muted">{recipe.description}</p>
            )}
            {onFindSimilar && (
              <button
                type="button"
                data-testid="action-find-similar"
                disabled={departureBlocked}
                onClick={() => onFindSimilar(recipe.id)}
                className="inline-flex min-h-[48px] max-w-full items-center justify-center gap-2 self-start rounded-full border border-chrome-line bg-white px-[16px] py-[12px] text-sm font-semibold text-ink-body shadow-sm hover:bg-charcoal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-body disabled:opacity-60"
              >
                <Search size={18} className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">
                  {t('recipes.findSimilar', 'Find Similar')}
                </span>
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
