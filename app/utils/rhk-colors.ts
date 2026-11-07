/**
 * Fixed color per RHK number (canvas "Tampilan kalender"): RHK 1 brand,
 * RHK 2 info, RHK 3 success, then purple/orange/pink. The RHK label is always
 * written too, so color is never the only cue.
 */
const RHK_COLORS = [
  { block: 'bg-brand-100 border-brand-100 dark:bg-brand-950/60 dark:border-brand-900', swatch: 'bg-brand-100 border-brand-300 dark:bg-brand-950 dark:border-brand-700' },
  { block: 'bg-blue-100 border-default dark:bg-blue-950/60 dark:border-blue-900', swatch: 'bg-blue-100 border-blue-300 dark:bg-blue-950 dark:border-blue-700' },
  { block: 'bg-green-100 border-default dark:bg-green-950/60 dark:border-green-900', swatch: 'bg-green-100 border-green-300 dark:bg-green-950 dark:border-green-700' },
  { block: 'bg-purple-100 border-default dark:bg-purple-950/60 dark:border-purple-900', swatch: 'bg-purple-100 border-purple-300 dark:bg-purple-950 dark:border-purple-700' },
  { block: 'bg-orange-100 border-default dark:bg-orange-950/60 dark:border-orange-900', swatch: 'bg-orange-100 border-orange-300 dark:bg-orange-950 dark:border-orange-700' },
  { block: 'bg-pink-100 border-default dark:bg-pink-950/60 dark:border-pink-900', swatch: 'bg-pink-100 border-pink-300 dark:bg-pink-950 dark:border-pink-700' }
]

export function rhkColor(number: number) {
  return RHK_COLORS[(Math.max(1, number) - 1) % RHK_COLORS.length]!
}
