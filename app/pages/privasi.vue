<script setup lang="ts">
definePageMeta({ layout: 'public' })
useSeoMeta({ title: 'Kebijakan privasi', description: 'Cara Ruang Kerja mengumpulkan, memakai, dan melindungi data pribadi pengguna.' })

const support = useRuntimeConfig().public.supportEmail
const updated = '7 November 2026'
const router = useRouter()
function goBack() {
  if (import.meta.client && window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

const sections = [
  {
    title: 'Tentang Ruang Kerja',
    body: [
      'Ruang Kerja adalah alat bantu kerja personal untuk ASN. Ruang Kerja tidak terhubung ke e-Kinerja BKN maupun sistem pemerintah lain, dan tidak mengirim data Anda ke sistem tersebut.',
      'Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).'
    ]
  },
  {
    title: 'Data yang kami kumpulkan',
    list: [
      'Data akun: nama lengkap, email, kata sandi (disimpan dalam bentuk hash, tidak pernah dalam bentuk asli), dan foto profil bila Anda mengunggahnya.',
      'Data profil yang Anda isi: nomor WhatsApp, tanggal lahir, jenis kelamin, alamat, NIP (opsional), status kepegawaian, pangkat/golongan, jabatan, unit kerja, instansi, serta nama dan jabatan atasan langsung.',
      'Data kerja: SKP, periode evaluasi, RHK dan indikator, rencana aksi, progres harian, hasil kerja, tautan bukti dukung, dan draf realisasi.',
      'Data teknis: alamat IP dan jenis perangkat/browser untuk sesi masuk, pembatasan percobaan masuk, dan keamanan akun.'
    ],
    note: 'Kami tidak meminta NIK maupun kata sandi akun pemerintah. Bukti dukung disimpan sebagai nama dokumen dan tautan, tanpa unggah file.'
  },
  {
    title: 'Untuk apa data dipakai',
    list: [
      'Menyediakan fitur Ruang Kerja: mencatat progres, mengumpulkan tautan bukti, dan menyusun draf realisasi dari catatan Anda sendiri.',
      'Mengirim email yang berkaitan dengan akun: verifikasi email, tautan masuk, dan atur ulang kata sandi.',
      'Menjaga keamanan layanan, termasuk mencegah penyalahgunaan dan percobaan masuk berulang.'
    ],
    note: 'Dasar pemrosesannya adalah persetujuan Anda dan pelaksanaan layanan yang Anda minta. Kami tidak menjual data dan tidak memakainya untuk iklan.'
  },
  {
    title: 'Keamanan data',
    list: [
      'Seluruh koneksi memakai HTTPS. Kata sandi disimpan dalam bentuk hash.',
      'Setiap data hanya bisa dibuka oleh pemilik akunnya.',
      'Sesi masuk memiliki masa berlaku, dan percobaan masuk dibatasi.'
    ]
  },
  {
    title: 'Pihak yang membantu kami memproses data',
    body: ['Untuk menjalankan layanan, sebagian data diproses oleh penyedia layanan berikut sesuai fungsinya:'],
    list: [
      'Penyedia hosting aplikasi dan basis data, untuk menyimpan dan menjalankan Ruang Kerja.',
      'Resend, untuk mengirim email akun.',
      'Cloudflare, untuk verifikasi keamanan (Turnstile) dan penyimpanan foto profil (R2).',
      'Google, hanya bila Anda memilih masuk dengan akun Google.'
    ],
    note: 'Fitur AI belum digunakan. Bila nanti tersedia, teks hanya dikirim ke penyedia AI setelah Anda menyetujuinya, dan data pribadi seperti NIP, tanggal lahir, dan alamat tidak pernah dikirim.'
  },
  {
    title: 'Hak Anda',
    list: [
      'Mengakses dan memperbaiki data Anda kapan saja dari halaman Profil dan menu terkait.',
      'Mengunduh seluruh data Anda (menu Profil › Ekspor data).',
      'Menghapus akun beserta seluruh data secara permanen (menu Profil › Hapus akun).',
      'Menarik persetujuan dengan berhenti memakai layanan dan menghapus akun.'
    ]
  },
  {
    title: 'Penyimpanan dan penghapusan',
    body: [
      'Data disimpan selama akun Anda aktif. Menghapus akun menghapus seluruh data kerja dan profil Anda secara permanen, bukan sekadar disembunyikan. Salinan cadangan basis data ikut terhapus mengikuti siklus pencadangan.'
    ]
  },
  {
    title: 'Tanggung jawab pengguna',
    body: [
      'Jangan memasukkan informasi rahasia negara, dokumen berklasifikasi, atau data pribadi warga ke Ruang Kerja. Pastikan tautan bukti dukung hanya bisa dibuka oleh pihak yang berhak.',
      'Draf realisasi bersifat personal dan perlu Anda periksa sebelum dipakai. Ruang Kerja tidak menggantikan persetujuan atasan, penilaian kinerja resmi, atau penyimpanan arsip instansi.'
    ]
  },
  {
    title: 'Perubahan kebijakan',
    body: ['Bila kebijakan ini berubah, kami memberi tahu lewat aplikasi atau email sebelum perubahan berlaku.']
  }
]
</script>

<template>
  <article class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-3xl font-bold tracking-tight text-highlighted">
        Kebijakan privasi
      </h1>
      <p class="text-sm text-muted">
        Terakhir diperbarui {{ updated }}
      </p>
    </header>

    <UCard
      v-for="s in sections"
      :key="s.title"
    >
      <h2 class="mb-3 text-lg font-semibold text-highlighted">
        {{ s.title }}
      </h2>
      <div class="flex flex-col gap-3 text-sm leading-6">
        <p
          v-for="(b, i) in s.body ?? []"
          :key="i"
        >
          {{ b }}
        </p>
        <ul
          v-if="s.list"
          class="list-disc space-y-1.5 pl-5"
        >
          <li
            v-for="(item, i) in s.list"
            :key="i"
          >
            {{ item }}
          </li>
        </ul>
        <p
          v-if="s.note"
          class="text-muted"
        >
          {{ s.note }}
        </p>
      </div>
    </UCard>

    <UCard>
      <h2 class="mb-3 text-lg font-semibold text-highlighted">
        Kontak
      </h2>
      <p class="text-sm leading-6">
        Pertanyaan, permintaan terkait data pribadi, atau laporan masalah keamanan:
        <ULink
          v-if="support"
          :to="`mailto:${support}`"
          class="font-medium text-info"
        >{{ support }}</ULink>
        <span v-else>melalui kanal dukungan yang tercantum di ruangkerja.io.</span>
      </p>
    </UCard>

    <div class="flex flex-wrap gap-3">
      <UButton
        icon="i-ctm-back-01"
        color="neutral"
        variant="outline"
        @click="goBack"
      >
        Kembali
      </UButton>
    </div>
  </article>
</template>
