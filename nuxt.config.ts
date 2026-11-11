// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/turnstile'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Ruang Kerja'
    }
  },

  css: ['~/assets/css/main.css'],

  // Light by default instead of following the OS. A choice made with the
  // sidebar toggle is kept in localStorage (nuxt-color-mode) and still wins.
  colorMode: {
    preference: 'light'
  },

  // Fonts are self-hosted from the CTM design system (app/assets/css/main.css).
  ui: {
    fonts: false
  },

  // Server-only values are overridden at runtime by NUXT_* env vars
  // (e.g. NUXT_R2_SECRET_ACCESS_KEY). Only `public` reaches the browser.
  runtimeConfig: {
    databaseUrl: '',
    // true only when behind exactly one trusted proxy that sets X-Forwarded-For (e.g. Vercel)
    trustProxy: false,
    betterAuthSecret: '',
    googleClientId: '',
    googleClientSecret: '',
    resendApiKey: '',
    emailFrom: '',
    r2: {
      accountId: '',
      accessKeyId: '',
      secretAccessKey: '',
      publicBucket: '',
      publicUrl: ''
    },
    sumopay: {
      // Managed Payment API key (X-Api-Key). Empty = checkout falls back to manual bank transfer.
      apiKey: '',
      // Live: https://api-pay.sumopod.com · Sandbox: https://api-pay-sandbox.sumopod.com
      baseUrl: 'https://api-pay.sumopod.com',
      // Webhook Signing Secret (whsec_...); comma-separate to accept a rotated one too.
      webhookSecret: '',
      // Optional payment_method_type_code (e.g. QRIS); empty lets the customer choose.
      paymentMethod: ''
    },
    turnstile: {
      secretKey: ''
    },
    public: {
      siteUrl: 'http://localhost:3000',
      // Shown on the privacy page (support owner is still an open PRD question)
      supportEmail: '',
      // Manual bank transfer shown on /subscription when SumoPay is not configured.
      payment: {
        bankName: '',
        accountNumber: '',
        accountName: '',
        // International format without '+', e.g. 6281234567890 (wa.me link).
        whatsapp: ''
      },
      turnstile: {
        siteKey: ''
      }
    }
  },

  // The admin panel opens on its dashboard.
  routeRules: {
    '/admin': { redirect: '/admin/dashboard' }
  },

  compatibilityDate: '2026-06-30',

  // server/services holds the longer database queries (one module per domain);
  // auto-imported like server/utils.
  nitro: {
    imports: {
      dirs: ['./server/services']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // CTM Project icon set (24x24, 1.5px stroke), extracted from the design
  // system into app/assets/icons/ctm → used as i-ctm-<name>.
  icon: {
    customCollections: [{ prefix: 'ctm', dir: './app/assets/icons/ctm' }],
    clientBundle: {
      scan: true,
      // Icons picked at runtime (ternaries) are not found by the scanner.
      icons: [
        'ctm:mic', 'ctm:checkmark-circle', 'ctm:clock', 'ctm:alert-circle', 'ctm:files-01',
        'ctm:warning', 'ctm:email-notification', 'lucide:square', 'lucide:sun', 'lucide:moon'
      ]
    }
  }

})
