<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LeaderboardTable from '../components/LeaderboardTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { useToast } from '../composables/useToast'
import { getSessionResults, getSessionState } from '../api/sessionsApi'
import { useAuth } from '../composables/useAuth'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()

const loading = ref(true)
const leaderboard = ref([])
const session = ref(null)

const sessionId = computed(() => Number(route.params.id || route.params.sessionId))

onMounted(loadResults)

async function loadResults() {
  loading.value = true

  try {
    const [stateResponse, resultsResponse] = await Promise.all([
      getSessionState(sessionId.value),
      getSessionResults(sessionId.value),
    ])

    session.value = stateResponse.session
    leaderboard.value = resultsResponse.leaderboard
  } catch (error) {
    toast.showToast({
      title: 'Не удалось загрузить результаты',
      message: error.message,
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push(auth.user.value?.role === 'organizer' ? '/organizer' : '/participant')
}
</script>

<template>
  <div class="grid gap-8">
    <section class="soft-panel rounded-[2rem] p-6">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Итоги игры</p>
      <h1 class="mt-2 text-4xl font-black">{{ session?.quizTitle || 'Результаты' }}</h1>
    </section>

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <LeaderboardTable :entries="leaderboard" />

      <button class="w-fit rounded-2xl bg-[var(--ink)] px-5 py-3 font-black text-white" @click="goBack">
        Вернуться назад
      </button>
    </template>
  </div>
</template>
