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

// --- CTM Button shared classes ------------------------------------------------
const BTN_FOCUS = 'outline-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 dark:focus-visible:outline-blue-400'
const BTN_DISABLED_FILL = 'disabled:bg-slate-100 disabled:text-slate-400 aria-disabled:bg-slate-100 aria-disabled:text-slate-400 dark:disabled:bg-[#222529] dark:disabled:text-[#5e6066] dark:aria-disabled:bg-[#222529] dark:aria-disabled:text-[#5e6066]'

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
    // CTM "Button" (ds-btn): sm 28 / md 36 / lg 44, 600 weight, gap 8,
    // radius 6 / 8 / 12. Primary = gold fill; Secondary = neutral outline;
    // Ghost = brand-800 text, no fill; icon-only buttons are square.
    button: {
      slots: { base: 'font-semibold disabled:opacity-100 aria-disabled:opacity-100' },
      variants: {
        size: {
          xs: { base: 'h-6 px-2 py-0 text-xs/4 gap-1 rounded-[6px]', leadingIcon: 'size-4', trailingIcon: 'size-4' },
          sm: { base: 'h-7 px-3 py-0 text-xs/4 gap-2 rounded-[6px]', leadingIcon: 'size-4', trailingIcon: 'size-4' },
          md: { base: 'h-9 px-4 py-0 text-sm/5 gap-2 rounded-sm', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          lg: { base: 'h-11 px-5 py-0 text-base/6 gap-2 rounded-md', leadingIcon: 'size-5', trailingIcon: 'size-5' },
          xl: { base: 'h-11 px-5 py-0 text-base/6 gap-2 rounded-md', leadingIcon: 'size-5', trailingIcon: 'size-5' }
        }
      },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: `text-ink bg-brand-400 hover:bg-brand-500 active:bg-brand-600 ${BTN_DISABLED_FILL} ${BTN_FOCUS}` },
        { color: 'primary', variant: 'outline', class: `text-brand-ink ring-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 ${BTN_FOCUS}` },
        { color: 'primary', variant: 'soft', class: `text-brand-ink bg-brand-100 hover:bg-brand-200 dark:bg-brand-950/50 ${BTN_FOCUS}` },
        { color: 'primary', variant: 'subtle', class: `text-brand-ink bg-brand-50 ring-brand-200 ${BTN_FOCUS}` },
        { color: 'primary', variant: 'ghost', class: `text-brand-ink hover:bg-transparent hover:text-brand-900 active:bg-transparent active:text-brand-900 dark:hover:text-brand-300 disabled:text-dimmed aria-disabled:text-dimmed ${BTN_FOCUS}` },
        { color: 'primary', variant: 'link', class: `h-auto px-0 font-normal text-blue-600 underline underline-offset-2 hover:text-blue-700 active:text-blue-800 dark:text-blue-400 ${BTN_FOCUS}` },
        { color: 'neutral', variant: 'outline', class: `ring-accented text-highlighted bg-default hover:bg-muted hover:ring-slate-400 dark:hover:ring-[#6b6d72] active:bg-elevated ${BTN_DISABLED_FILL} disabled:ring-accented aria-disabled:ring-accented ${BTN_FOCUS}` },
        { color: 'neutral', variant: 'ghost', class: `text-toned hover:text-highlighted hover:bg-muted active:bg-elevated disabled:text-dimmed aria-disabled:text-dimmed ${BTN_FOCUS}` },
        { color: 'neutral', variant: 'link', class: `h-auto px-0 font-normal text-toned hover:text-highlighted ${BTN_FOCUS}` },
        { variant: 'link', class: 'h-auto px-0 font-normal' },
        { size: 'xs', square: true, class: 'w-6 px-0 justify-center' },
        { size: 'sm', square: true, class: 'w-7 px-0 justify-center' },
        { size: 'md', square: true, class: 'w-9 px-0 justify-center' },
        { size: 'lg', square: true, class: 'w-11 px-0 justify-center' },
        { size: 'xl', square: true, class: 'w-11 px-0 justify-center' }
      ]
    },
    // CTM "Chip": subtle = status label (14/20, radius 8, no border, semantic
    // 100 fill + 600/700 text); soft/outline neutral = field chip (pill).
    // size sm = 12/18 field chip, md/lg = 14/20 label chip.
    badge: {
      slots: { base: 'font-normal' },
      variants: {
        size: {
          sm: { base: 'text-xs/[18px] px-2 py-1 gap-1 rounded-full', leadingIcon: 'size-3', trailingIcon: 'size-3' },
          md: { base: 'text-sm/5 px-3 py-1 gap-2 rounded-sm', leadingIcon: 'size-3.5', trailingIcon: 'size-3.5' },
          lg: { base: 'text-sm/5 px-3 py-1 gap-2 rounded-sm', leadingIcon: 'size-3.5', trailingIcon: 'size-3.5' }
        }
      },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-ink' },
        { color: 'primary', variant: 'soft', class: 'text-brand-ink bg-brand-100 dark:bg-brand-950/50' },
        { color: 'primary', variant: 'subtle', class: 'text-brand-ink bg-brand-50 ring-0' },
        { color: 'primary', variant: 'outline', class: 'text-brand-ink ring-brand-600' },
        { color: 'success', variant: 'subtle', class: 'ring-0 bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400' },
        { color: 'info', variant: 'subtle', class: 'ring-0 bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400' },
        { color: 'warning', variant: 'subtle', class: 'ring-0 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' },
        { color: 'error', variant: 'subtle', class: 'ring-0 bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400' },
        { color: 'neutral', variant: 'subtle', class: 'ring-0 bg-elevated text-toned' },
        { color: 'neutral', variant: 'soft', class: 'bg-elevated text-toned rounded-full' },
        { color: 'neutral', variant: 'outline', class: 'ring-default text-toned rounded-full' }
      ]
    },
    // CTM checkbox: 20px box, radius 2, border-secondary; checked = gold fill.
    checkbox: {
      slots: { base: 'rounded-[2px] ring-slate-300 dark:ring-[#3e4045]' },
      variants: { size: { md: { base: 'size-5', icon: 'size-3.5' } } },
      compoundVariants: [{ color: 'primary', class: { indicator: 'text-ink bg-brand-400' } }]
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
    // CTM tabs: pill = gold active pill on a slate-100 track (36px items);
    // link = underline tabs, active brand-800 text + 2px gold underline.
    tabs: {
      compoundVariants: [
        {
          color: 'primary',
          variant: 'pill',
          class: {
            list: 'rounded-full bg-elevated p-1 gap-1',
            indicator: 'rounded-full bg-primary shadow-none inset-y-1',
            trigger: 'grow-0 h-9 rounded-full px-4 py-2 text-sm/5 font-medium data-[state=active]:text-ink data-[state=inactive]:text-toned hover:data-[state=inactive]:not-disabled:text-highlighted'
          }
        },
        {
          color: 'primary',
          variant: 'link',
          class: {
            indicator: 'bg-primary h-0.5',
            trigger: 'px-3 py-2.5 text-sm/5 font-medium data-[state=active]:text-brand-ink data-[state=inactive]:text-toned hover:data-[state=inactive]:not-disabled:text-highlighted',
            trailingBadge: 'h-[18px] min-w-5 justify-center rounded-full ring-0 bg-muted px-1.5 text-[11px]/none font-semibold tabular-nums text-toned group-data-[state=active]:bg-brand-100 group-data-[state=active]:text-brand-800'
          }
        }
      ]
    },
    // CTM "Banner" subtle: semantic 100 fill, no border, radius 8, 12/16
    // padding, 20px icon in the 700 step, title semibold, description secondary.
    alert: {
      slots: {
        root: 'rounded-sm px-4 py-3 gap-3',
        title: 'text-sm/5 font-semibold',
        description: 'text-sm/5 opacity-100'
      },
      compoundVariants: [
        { color: 'info', variant: 'subtle', class: { root: 'bg-blue-100 ring-0 text-highlighted dark:bg-blue-950/60', icon: 'text-blue-700 dark:text-blue-400', description: 'text-toned' } },
        { color: 'warning', variant: 'subtle', class: { root: 'bg-amber-100 ring-0 text-highlighted dark:bg-amber-950/60', icon: 'text-amber-600 dark:text-amber-400', description: 'text-toned' } },
        { color: 'success', variant: 'subtle', class: { root: 'bg-green-100 ring-0 text-highlighted dark:bg-green-950/60', icon: 'text-green-600 dark:text-green-400', description: 'text-toned' } },
        { color: 'error', variant: 'subtle', class: { root: 'bg-red-100 ring-0 text-highlighted dark:bg-red-950/60', icon: 'text-red-600 dark:text-red-400', description: 'text-toned' } }
      ]
    },
    // CTM "Card" (ds-card): white, 1px border-primary, radius 12, padding 24,
    // no dividers between header and body (lists draw their own lines).
    card: {
      slots: {
        root: 'rounded-md',
        header: 'px-5 pt-5 pb-0 sm:px-6 sm:pt-6',
        title: 'text-lg/[26px]',
        body: 'p-5 sm:p-6',
        footer: 'px-5 pb-5 pt-0 sm:px-6 sm:pb-6'
      },
      variants: { variant: { outline: { root: 'divide-y-0' } } }
    },
    // CTM "Table" (ds-tbl): header row 52px on bg-secondary, 14/20 semibold
    // text-tertiary; cells 16px padding, 14/20 text-primary, rows separated by
    // border-secondary; hover bg-secondary, selected bg-tertiary.
    table: {
      slots: {
        tbody: '[&>tr]:hover:bg-muted divide-accented',
        tr: 'data-[selected=true]:bg-elevated',
        th: 'h-13 p-4 bg-muted text-sm/5 font-semibold text-muted whitespace-nowrap',
        td: 'h-18 p-4 text-sm/5 text-highlighted whitespace-normal',
        separator: 'bg-(--ui-border)'
      }
    },
    // CTM "Progress": slate-100 track, brand-700 fill.
    progress: {
      slots: { base: 'bg-elevated' },
      compoundVariants: [{ color: 'primary', class: { indicator: 'bg-brand-700 dark:bg-brand-400' } }]
    },
    // CTM page header: 64px white bar, 12/32 padding, 20/28 semibold title.
    dashboardNavbar: {
      slots: {
        root: 'h-16 bg-default px-4 sm:px-8',
        title: 'text-xl/7 font-semibold tracking-[-0.2px]'
      }
    },
    // Toolbars wrap on narrow screens instead of hiding actions off-screen.
    dashboardToolbar: {
      slots: {
        root: 'flex-wrap gap-y-2 py-2 overflow-x-visible',
        left: 'flex-wrap gap-y-2',
        right: 'flex-wrap gap-y-2 ml-auto'
      }
    },
    // CTM page canvas: bg-secondary behind white header and cards, 32px
    // padding. Room for the bottom navigation on phones (< 740 px).
    dashboardPanel: {
      slots: { body: 'bg-muted p-4 sm:p-8 max-[739px]:pb-24' }
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
      variants: { size: { lg: FIELD_SIZE } },
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
