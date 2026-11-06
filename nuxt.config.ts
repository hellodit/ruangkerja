// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/turnstile'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

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
      privateBucket: '',
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

  i18n: {
    defaultLocale: 'id',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'id', language: 'id-ID', name: 'Bahasa Indonesia', file: 'id.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ]
  }
})
