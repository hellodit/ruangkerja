// CTM Project design system mapped onto Nuxt UI.
// Gold (brand-400) is light: anything drawn ON it uses ink (#111216), never white.

// --- CTM Field (ds-field) shared classes -------------------------------------
const FIELD_PLACEHOLDER = 'text-slate-500 dark:text-[#8a8d93]'
const FIELD_ICON = 'size-5 text-slate-600 dark:text-[#bdc0c4]'
const FIELD_SIZE = 'h-11 px-3 py-0 gap-2 text-base/5 md:text-sm/5'
const FIELD_DISABLED = 'disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-[#222529] dark:disabled:text-[#5e6066]'
const FIELD_BASE = [
  'rounded-md placeholder:text-slate-500 dark:placeholder:text-[#8a8d93] read-only:bg-slate-50 dark:read-only:bg-[#222529]',
  FIELD_DISABLED
]
const FIELD_BASE_BUTTON = ['rounded-md', FIELD_DISABLED]
const FIELD_STATES = [
  {
    color: 'primary' as const,
    variant: 'outline' as const,
    class: 'hover:bg-default hover:ring-slate-400 dark:hover:ring-[#6b6d72] focus-visible:outline-0 focus-visible:ring-brand-700 dark:focus-visible:ring-brand-400 data-[state=open]:ring-brand-700 dark:data-[state=open]:ring-brand-400 keyboard:focus-visible:ring-2 keyboard:focus-visible:ring-blue-700 dark:keyboard:focus-visible:ring-blue-400'
  },
  { color: 'error' as const, highlight: true, class: 'ring-red-700 hover:ring-red-700 focus-visible:outline-0 focus-visible:ring-red-700' }
]

export default defineAppConfig({
  ui: {
    // Nuxt UI's built-in icons → CTM icon set.
    icons: {
      arrowLeft: 'i-ctm-back-01',
      arrowRight: 'i-ctm-next-01',
      arrowUp: 'i-ctm-arrow-up',
      check: 'i-ctm-check',
      chevronDown: 'i-ctm-chevron-down',
      chevronLeft: 'i-ctm-chevron-left',
      chevronRight: 'i-ctm-chevron-right',
      chevronUp: 'i-ctm-chevron-up',
      chevronDoubleLeft: 'i-ctm-arrow-left-double',
      chevronDoubleRight: 'i-ctm-arrow-right-double',
      close: 'i-ctm-close',
      copy: 'i-ctm-copy',
      copyCheck: 'i-ctm-check',
      ellipsis: 'i-ctm-more',
      error: 'i-ctm-alert-circle',
      eye: 'i-ctm-view-on',
      eyeOff: 'i-ctm-view-off',
      info: 'i-ctm-information',
      menu: 'i-ctm-list-bullet',
      minus: 'i-ctm-minus',
      panelClose: 'i-ctm-hide-side-panel',
      panelOpen: 'i-ctm-hide-side-panel',
      plus: 'i-ctm-plus',
      reload: 'i-ctm-refresh',
      search: 'i-ctm-search',
      success: 'i-ctm-checkmark-circle',
      upload: 'i-ctm-upload',
      warning: 'i-ctm-warning'
    },
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
    // CTM "Menu Tree" (ds-navtree): 40px items, radius-sm, 14/20 medium,
    // text-secondary + icon-secondary; hover bg-secondary; current page
    // bg-brand-subtle + fg-brand-subtle semibold; counters are pills.
    navigationMenu: {
      slots: {
        list: 'flex flex-col gap-0.5',
        label: 'px-3 pt-4 pb-1 text-[11px]/4 font-medium tracking-[1.1px] uppercase text-muted',
        link: 'min-h-10 gap-3 rounded-sm text-sm/5 font-medium tracking-[-0.16px] text-toned before:rounded-sm',
        linkLeadingIcon: 'size-5 text-toned',
        linkTrailingBadge: 'inline-flex h-[18px] min-w-5 justify-center rounded-full bg-elevated px-1.5 text-[11px]/none font-semibold tabular-nums text-toned ring-0'
      },
      variants: {
        orientation: {
          vertical: { link: 'px-3 py-2 before:inset-0' }
        },
        disabled: {
          true: { link: 'opacity-100 text-slate-400 dark:text-[#5e6066]', linkLeadingIcon: 'text-slate-400 dark:text-[#5e6066]' }
        },
        active: {
          false: { link: 'text-toned', linkLeadingIcon: 'text-toned' }
        }
      },
      compoundVariants: [
        {
          variant: 'pill',
          disabled: false,
          active: false,
          class: {
            link: 'text-toned hover:text-highlighted hover:before:bg-muted',
            linkLeadingIcon: 'text-toned group-hover:text-highlighted'
          }
        },
        {
          color: 'primary',
          variant: 'pill',
          active: true,
          class: {
            link: 'font-semibold text-brand-800 before:bg-brand-50 dark:text-brand-300 dark:before:bg-[#2e2a18]',
            linkLeadingIcon: 'text-brand-800 dark:text-brand-300',
            linkTrailingBadge: 'bg-brand-100 text-brand-800 dark:bg-[#3a2f12] dark:text-brand-300'
          }
        }
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
    // Toolbars wrap on narrow screens instead of hiding actions off-screen.
    dashboardToolbar: {
      slots: {
        root: 'flex-wrap gap-y-2 py-2 overflow-x-visible',
        left: 'flex-wrap gap-y-2',
        right: 'flex-wrap gap-y-2 ml-auto'
      }
    },
    // Room for the bottom navigation on phones (< 740 px).
    dashboardPanel: {
      slots: { body: 'max-[739px]:pb-24' }
    },
    // CTM "Field" (ds-field): 44px, radius-md, 1px border-secondary,
    // 14/20 text, placeholder text-placeholder, icons 20px icon-secondary.
    // Hover border-tertiary; mouse focus = 1px gold border (no glow);
    // keyboard focus = 2px blue (border-focus-ring); error = red-700.
    input: {
      slots: {
        root: 'w-full',
        base: FIELD_BASE,
        leadingIcon: FIELD_ICON,
        trailingIcon: FIELD_ICON
      },
      variants: { size: { lg: { base: FIELD_SIZE } } },
      compoundVariants: FIELD_STATES,
      defaultVariants: { size: 'lg', color: 'primary', variant: 'outline' }
    },
    inputNumber: {
      slots: { root: 'w-full', base: FIELD_BASE },
      variants: { size: { lg: { base: FIELD_SIZE } } },
      compoundVariants: FIELD_STATES,
      defaultVariants: { size: 'lg', color: 'primary', variant: 'outline' }
    },
    textarea: {
      slots: {
        root: 'w-full',
        base: FIELD_BASE,
        leadingIcon: FIELD_ICON,
        trailingIcon: FIELD_ICON
      },
      variants: { size: { lg: { base: 'px-3 py-2.5 text-base/5 md:text-sm/5' } } },
      compoundVariants: FIELD_STATES,
      defaultVariants: { size: 'lg', color: 'primary', variant: 'outline' }
    },
    select: {
      slots: {
        base: ['w-full', FIELD_BASE_BUTTON],
        placeholder: FIELD_PLACEHOLDER,
        leadingIcon: FIELD_ICON,
        trailingIcon: FIELD_ICON
      },
      variants: { size: { lg: { base: FIELD_SIZE } } },
      compoundVariants: FIELD_STATES,
      defaultVariants: { size: 'lg', color: 'primary', variant: 'outline' }
    },
    selectMenu: {
      slots: {
        base: ['w-full', FIELD_BASE_BUTTON],
        placeholder: FIELD_PLACEHOLDER,
        leadingIcon: FIELD_ICON,
        trailingIcon: FIELD_ICON
      },
      variants: { size: { lg: { base: FIELD_SIZE } } },
      compoundVariants: FIELD_STATES,
      defaultVariants: { size: 'lg', color: 'primary', variant: 'outline' }
    },
    // Label 14/20 medium text-primary; no required marker (required is the
    // default); hint = "Opsional" pill right after the label; subtitle,
    // hint text and error 12/18, 4px from the input.
    formField: {
      slots: {
        labelWrapper: 'flex items-center justify-start gap-2',
        label: 'block text-sm/5 font-medium text-highlighted',
        description: 'text-xs/[18px] text-muted',
        hint: 'inline-flex items-center rounded-full bg-elevated px-2 py-0.5 text-[11px]/4 font-medium text-toned',
        help: 'mt-1 text-xs/[18px] text-muted',
        error: 'mt-1 text-xs/[18px] text-red-600 dark:text-[#e57373]'
      },
      variants: {
        required: { true: { label: 'after:content-none' } }
      }
    }
  }
})
