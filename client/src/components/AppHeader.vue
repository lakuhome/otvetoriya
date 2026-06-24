<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import { useAuth } from '../composables/useAuth'
import logoUrl from '../assets/logo.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuth()

const navigation = computed(() => {
  if (!auth.user.value) {
    return [
      { to: '/login', label: 'Вход' },
      { to: '/register', label: 'Регистрация' },
    ]
  }

  if (auth.user.value.role === 'organizer') {
    return [
      { to: '/organizer', label: 'Кабинет' },
      { to: '/organizer/quizzes/new', label: 'Новый квиз' },
    ]
  }

  return [
    { to: '/participant/room', label: 'Комната' },
    { to: '/participant/stats', label: 'Статистика' },
  ]
})

const roleLabel = computed(() => {
  if (!auth.user.value) {
    return ''
  }

  return auth.user.value.role === 'organizer' ? 'Организатор' : 'Участник'
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-white/35 bg-white/18 backdrop-blur-2xl">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <RouterLink to="/" class="flex items-center gap-3 no-underline">
        <img :src="logoUrl" alt="Логотип Ответория" class="h-12 w-12 rounded-[1.4rem] shadow-[0_18px_34px_rgba(86,145,214,0.26)]" />
        <div>
          <p class="text-[1.15rem] font-black tracking-[-0.03em] text-[var(--ink)]">Ответория</p>
        </div>
      </RouterLink>

      <nav class="flex items-center gap-2">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition"
          :class="route.path === item.to ? 'border-white/45 bg-white/70 text-[var(--accent-deep)] shadow-[0_10px_20px_rgba(105,149,204,0.16)]' : 'text-[var(--muted)] hover:border-white/35 hover:bg-white/34'"
        >
          {{ item.label }}
        </RouterLink>

        <div
          v-if="auth.user.value"
          class="ml-2 hidden rounded-full border border-white/40 bg-white/42 px-4 py-2 text-sm text-[var(--muted)] shadow-[0_10px_20px_rgba(105,149,204,0.12)] sm:flex sm:items-center sm:gap-2"
        >
          <span class="font-semibold text-[var(--ink)]">{{ auth.user.value.displayName }}</span>
          <span class="text-xs uppercase tracking-[0.2em]">{{ roleLabel }}</span>
        </div>

        <button
          v-if="auth.user.value"
          type="button"
          class="rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(95,174,255,0.95),rgba(34,108,218,0.95))] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(73,130,202,0.26)]"
          @click="handleLogout"
        >
          Выйти
        </button>
      </nav>
    </div>
  </header>
</template>
