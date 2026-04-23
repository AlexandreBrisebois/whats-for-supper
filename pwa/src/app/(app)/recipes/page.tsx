'use client';

import { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Star,
  ArrowRight,
  Sparkles,
  Clock,
  ChefHat,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { getRecommendations, RecommendationsResponse } from '@/lib/api/recipes';
import { useRouter, useSearchParams } from 'next/navigation';
import { assignRecipeToDay } from '@/lib/api/planner';
import { cn } from '@/lib/utils';

/**
 * RecipesPage / Search destination.
 * Focuses on an agentic, free-text search experience with a "Top Pick" highlight.
 */
export default function RecipesPage() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const addToDay = searchParams.get('addToDay');
  const weekOffset = searchParams.get('weekOffset');

  useEffect(() => {
    async function loadData() {
      try {
        const recommendations = await getRecommendations();
        setData(recommendations);
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSelectRecipe = async (recipe: any) => {
    if (addToDay !== null && weekOffset !== null) {
      setIsAssigning(true);
      try {
        await assignRecipeToDay(parseInt(weekOffset), parseInt(addToDay), {
          id: recipe.id,
          name: recipe.name || recipe.title,
          image: recipe.image || recipe.imageUrl,
        });
        router.push(`/planner?success=1&dayIndex=${addToDay}`);
      } catch (error) {
        console.error('Failed to assign recipe:', error);
        setIsAssigning(false);
      }
    } else {
      // Normal recipe view logic
      console.log('Viewing recipe:', recipe.id);
    }
  };

  const { topPick, results } = data ?? { topPick: null, results: [] };

  return (
    <div className="flex flex-col gap-8 pb-12">
      {addToDay !== null && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-terracotta/10 border border-terracotta/20 rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta/60 mb-1">
              Planning Mode
            </p>
            <p className="text-sm font-bold text-charcoal">
              Select a meal for Day {parseInt(addToDay) + 1}
            </p>
          </div>
          <button
            onClick={() => router.push('/planner')}
            className="text-xs font-bold text-terracotta hover:underline"
          >
            Cancel
          </button>
        </motion.div>
      )}
      {/* Search zone — always rendered so tests can locate it immediately */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group mt-2"
      >
        <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-charcoal/30 group-focus-within:text-terracotta transition-colors z-10">
          <SearchIcon size={24} strokeWidth={2.5} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Something spicy for 4..."
          className="w-full bg-white/70 backdrop-blur-md border-2 border-charcoal/5 rounded-[2rem] py-5 pl-16 pr-8 text-lg font-bold text-charcoal placeholder:text-charcoal/20 focus:outline-none focus:border-terracotta/20 transition-all shadow-card focus:shadow-xl focus:bg-white"
        />
        {query && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <Sparkles size={20} className="text-terracotta animate-pulse" />
          </div>
        )}
      </motion.div>

      {/* Results Section */}
      <div className="flex flex-col gap-6">
        {isLoading ? (
          <div className="flex h-48 w-full items-center justify-center">
            <Loader2 className="animate-spin text-ochre" size={48} />
          </div>
        ) : !data ? null : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between px-1"
            >
              <h2 className="font-heading text-[11px] font-black uppercase tracking-[0.2em] text-charcoal/40">
                Agent&apos;s Recommendations
              </h2>
            </motion.div>

            {/* Top Pick Hero */}
            {topPick && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => handleSelectRecipe(topPick)}
                className={cn(
                  'relative group cursor-pointer active:scale-[0.98] transition-all',
                  isAssigning && 'opacity-50 pointer-events-none'
                )}
              >
                <div className="absolute top-5 left-5 z-20 bg-ochre text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-1.5">
                  <Star size={12} fill="currentColor" /> Top Pick
                </div>

                <div className="relative w-full aspect-[16/10] min-h-[240px] rounded-[2.5rem] overflow-hidden shadow-2xl glass-solar border border-white/20">
                  <Image
                    src={topPick.imageUrl}
                    alt={topPick.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-90" />

                  <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2.5 text-white z-10">
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <Clock size={10} /> {topPick.prepTime}
                      </span>
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                        <ChefHat size={10} /> {topPick.difficulty}
                      </span>
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter leading-none">
                      {topPick.name}
                    </h3>
                    <p className="text-white/70 text-sm font-medium line-clamp-2 max-w-[90%] leading-snug">
                      {topPick.description}
                    </p>
                  </div>

                  <div className="absolute bottom-6 right-6 z-10">
                    <div className="h-12 w-12 rounded-full bg-white text-charcoal flex items-center justify-center shadow-xl transition-all group-hover:bg-terracotta group-hover:text-white group-hover:scale-110">
                      <ArrowRight size={24} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Secondary Results */}
            <div className="grid grid-cols-2 gap-4">
              {results.map((recipe, idx) => (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  onClick={() => handleSelectRecipe(recipe)}
                  className={cn(
                    'group flex flex-col gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-[2rem] border border-charcoal/5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95',
                    isAssigning && 'opacity-50 pointer-events-none'
                  )}
                >
                  <div className="relative aspect-[4/3] rounded-[1.5rem] overflow-hidden">
                    <Image
                      src={recipe.image}
                      alt={recipe.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="flex flex-col gap-1 px-1.5 pb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-charcoal/30 flex items-center gap-1">
                      <Clock size={9} /> {recipe.time}
                    </span>
                    <h4 className="text-base font-black tracking-tighter leading-tight text-charcoal truncate">
                      {recipe.name}
                    </h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
