<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import LoadingSpinner from '../components/LoadingSpinner.vue'
import RoomCodeCard from '../components/RoomCodeCard.vue'
import { useToast } from '../composables/useToast'
import { getSessionByCode } from '../api/sessionsApi'

const router = useRouter()
const toast = useToast()

const roomCode = ref('')
const preview = ref(null)
const previewLoading = ref(false)

async function previewRoom() {
  previewLoading.value = true

  try {
    const response = await getSessionByCode(roomCode.value)
    preview.value = response.session
  } catch (error) {
    preview.value = null
    toast.showToast({
      title: 'Комната не найдена',
      message: error.message,
      type: 'error',
    })
  } finally {
    previewLoading.value = false
  }
}

function goToGame() {
  if (!preview.value) {
    return
  }

  router.push(`/game/${preview.value.sessionId}?roomCode=${preview.value.roomCode}`)
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
    <section class="soft-panel rounded-[2rem] p-6 sm:p-8">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Комната</p>
      <h1 class="mt-2 text-4xl font-black">Подключение к игре</h1>
      <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Введите код комнаты, чтобы найти активную игру и присоединиться к участникам.
      </p>

      <div class="mt-6 grid gap-3">
        <input
          v-model="roomCode"
          maxlength="6"
          placeholder="Введите код комнаты"
          class="rounded-[1.5rem] border border-[var(--line)] bg-white px-5 py-4 text-center text-2xl font-black tracking-[0.28em]"
        />
        <div class="flex flex-wrap gap-3">
          <button class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)]" @click="previewRoom">
            Найти комнату
          </button>
          <button
            class="rounded-2xl border border-white/35 bg-white/52 px-5 py-3 font-semibold text-[var(--ink)]"
            :disabled="!preview"
            @click="goToGame"
          >
            Войти в комнату
          </button>
        </div>
      </div>

      <LoadingSpinner v-if="previewLoading" class="mt-6" />
    </section>

    <section class="grid gap-6">
      <RoomCodeCard :room-code="preview?.roomCode || ''" />

      <div class="soft-panel rounded-[2rem] p-6">
        <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Как это работает</p>
        <h2 class="mt-2 text-2xl font-black">Быстрое подключение</h2>
        <p class="mt-3 text-sm leading-7 text-[var(--muted)]">
          Получите шестизначный код у организатора, введите его в поле и подтвердите вход в найденную комнату.
        </p>
      </div>
    </section>
  </div>
</template>
