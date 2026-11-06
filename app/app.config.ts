// CTM Project design system mapped onto Nuxt UI.
// Gold (brand-400) is light: anything drawn ON it uses ink (#111216), never white.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      neutral: 'slate',
      success: 'green',
      warning: 'amber',
      error: 'red',
      info: 'blue'
    },
    button: {
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-ink hover:bg-brand-500 active:bg-brand-600 disabled:bg-primary aria-disabled:bg-primary' },
        { color: 'primary', variant: 'outline', class: 'text-brand-ink ring-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40' },
        { color: 'primary', variant: 'soft', class: 'text-brand-ink bg-brand-100 hover:bg-brand-200 dark:bg-brand-950/50' },
        { color: 'primary', variant: 'subtle', class: 'text-brand-ink bg-brand-50 ring-brand-200' },
        { color: 'primary', variant: 'ghost', class: 'text-brand-ink hover:bg-brand-50 dark:hover:bg-brand-950/40' },
        { color: 'primary', variant: 'link', class: 'text-brand-ink' }
      ]
    },
    badge: {
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-ink' },
        { color: 'primary', variant: 'soft', class: 'text-brand-ink bg-brand-100 dark:bg-brand-950/50' },
        { color: 'primary', variant: 'subtle', class: 'text-brand-ink bg-brand-50 ring-brand-200' },
        { color: 'primary', variant: 'outline', class: 'text-brand-ink ring-brand-600' }
      ]
    },
    checkbox: {
      compoundVariants: [{ color: 'primary', class: { indicator: 'text-ink' } }]
    },
    radioGroup: {
      compoundVariants: [{ color: 'primary', class: { indicator: 'after:bg-ink' } }]
    },
    switch: {
      slots: { thumb: 'bg-white' }
    },
    stepper: {
      compoundVariants: [{ color: 'primary', class: { trigger: 'group-data-[state=completed]:text-ink group-data-[state=active]:text-ink' } }]
    },
    navigationMenu: {
      compoundVariants: [
        { color: 'primary', variant: 'pill', active: true, class: { link: 'text-highlighted before:bg-brand-100 dark:before:bg-brand-950/60', linkLeadingIcon: 'text-brand-ink' } }
      ]
    },
    tabs: {
      compoundVariants: [
        { color: 'primary', variant: 'pill', class: { indicator: 'bg-default shadow-xs ring ring-default', trigger: 'data-[state=active]:text-highlighted' } },
        { color: 'primary', variant: 'link', class: { indicator: 'bg-brand-600', trigger: 'data-[state=active]:text-highlighted' } }
      ]
    },
    card: {
      slots: { root: 'rounded-lg' }
    },
    input: {
      slots: { root: 'w-full' }
    },
    textarea: {
      slots: { root: 'w-full' }
    },
    select: {
      slots: { base: 'w-full' }
    },
    selectMenu: {
      slots: { base: 'w-full' }
    }
  }
})
