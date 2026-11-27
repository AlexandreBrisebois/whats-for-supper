import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ServingGroceryRefresh } from '@/lib/api/generated/models';
import { cn } from '@/lib/utils';
import { t } from '@/locales';

interface GroceryListHeaderProps {
  isEmbedded?: boolean;
  onClose?: () => void;
  setHeadingNode: (node: HTMLHeadingElement | null) => void;
  servingRefresh?: ServingGroceryRefresh | null;
  refreshError: boolean;
  onRetryPortions: () => void;
}

export function GroceryListHeader({
  isEmbedded,
  onClose,
  setHeadingNode,
  servingRefresh,
  refreshError,
  onRetryPortions,
}: GroceryListHeaderProps) {
  return (
    <>
      <div
        className={cn(
          'flex items-center justify-between border-b border-chrome-line bg-white backdrop-blur-md',
          isEmbedded ? 'px-6 py-2.5' : 'p-8'
        )}
      >
        <div className={cn(isEmbedded ? 'py-0.5' : 'py-0')}>
          {!isEmbedded && (
            <p className="text-xs font-semibold text-garden-ink">
              {t('grocery.smartShopping', 'Smart Shopping')}
            </p>
          )}
          <h2
            ref={setHeadingNode}
            tabIndex={-1}
            className={cn(
              'font-heading font-black text-ink-body',
              isEmbedded ? 'text-lg' : 'text-xl'
            )}
          >
            {t('grocery.checklist', 'Grocery Checklist')}
          </h2>
        </div>
        {onClose && !isEmbedded && (
          <Button
            variant="secondary"
            onClick={onClose}
            aria-label={t('grocery.close', 'Close grocery list')}
            className="rounded-full h-14 w-14 p-0 border-chrome-line"
          >
            ×
          </Button>
        )}
      </div>

      {servingRefresh?.status === 'updating' && (
        <p
          role="status"
          className="mx-4 mt-3 mb-1 rounded-2xl border border-garden-line bg-sage-50 p-4 text-ink-body"
          data-testid="grocery-portions-updating"
        >
          {t('portions.updating', 'Updating your shopping list…')}
        </p>
      )}
      {(servingRefresh?.status === 'failed' || refreshError) && (
        <div
          role="alert"
          className="mx-4 mt-3 mb-1 flex flex-wrap items-center gap-3 rounded-2xl border border-hearth-line bg-terracotta-50 p-4 text-ink-body"
          data-testid="grocery-portions-failed"
        >
          <p className="min-w-0 flex-1">
            {t('portions.refreshFailed', 'Portions saved. Shopping list needs updating.')}
          </p>
          <Button variant="primary" size="md" onClick={onRetryPortions}>
            {t('portions.retry', 'Retry')}
          </Button>
        </div>
      )}
    </>
  );
}

interface GroceryEmptyStateProps {
  onClose?: () => void;
}

export function GroceryEmptyState({ onClose }: GroceryEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 px-6"
    >
      <div className="h-24 w-24 bg-sage-50 border border-garden-line rounded-full flex items-center justify-center mx-auto mb-6">
        <ShoppingCart size={40} className="text-garden-ink" />
      </div>
      <h3 className="text-xl font-heading font-black text-ink-body mb-2">
        {t('grocery.emptyTitle', 'Your list is empty')}
      </h3>
      <p className="text-ink-muted font-medium mb-12 max-w-[240px] mx-auto">
        {t(
          'grocery.emptySubtext',
          'Add meals to your planner and your grocery list will build itself — organized by store section.'
        )}
      </p>
      {onClose && (
        <Button
          onClick={onClose}
          className="bg-hearth-fill hover:bg-hearth-fill-hover active:bg-hearth-fill-active text-white rounded-3xl h-16 px-10 font-bold shadow-xl shadow-terracotta/20 active:scale-95 transition-all"
        >
          {t('grocery.startPlanning', 'Start Planning')}
        </Button>
      )}
    </motion.div>
  );
}
