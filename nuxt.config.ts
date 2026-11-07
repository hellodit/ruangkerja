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
      title: 'RuangKerja'
    }
  },

  css: ['~/assets/css/main.css'],

  // Fonts are self-hosted from the CTM design system (app/assets/css/main.css).
  ui: {
    fonts: false
  },

  // Server-only values are overridden at runtime by NUXT_* env vars
  // (e.g. NUXT_R2_SECRET_ACCESS_KEY). Only `public` reaches the browser.
  runtimeConfig: {
    databaseUrl: '',
    // base64 of 32 random bytes: openssl rand -base64 32
    dataEncryptionKey: '',
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
    singapay: {
      // Comma-separated list so a rotated key can be accepted alongside the old one.
      webhookSecret: ''
    },
    turnstile: {
      secretKey: ''
    },
    public: {
      siteUrl: 'http://localhost:3000',
      // Shown on the privacy page (support owner is still an open PRD question)
      supportEmail: '',
      turnstile: {
        siteKey: ''
      }
    }
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // Icons picked at runtime (ternaries) are not found by the bundle scanner.
  icon: {
    clientBundle: {
      scan: true,
      icons: [
        'lucide:mic', 'lucide:square', 'lucide:circle-check', 'lucide:clock', 'lucide:sun', 'lucide:moon',
        'lucide:badge-check', 'lucide:circle-x', 'lucide:file-text', 'lucide:triangle-alert'
      ]
    }
  }

})
