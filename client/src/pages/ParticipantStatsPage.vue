<script setup>
import { onMounted, ref } from 'vue'

import HistoryTable from '../components/HistoryTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import { useToast } from '../composables/useToast'
import { getParticipantHistory } from '../api/sessionsApi'

const loading = ref(true)
const history = ref([])
const toast = useToast()

const historyColumns = [
  { key: 'quizTitle', label: 'Квиз' },
  { key: 'score', label: 'Очки' },
  { key: 'place', label: 'Место' },
  { key: 'participantsCount', label: 'Участники' },
]

onMounted(loadHistory)

async function loadHistory() {
  loading.value = true

  try {
    const response = await getParticipantHistory()
    history.value = response.history
  } catch (error) {
    toast.showToast({
      title: 'Не удалось загрузить статистику',
      message: error.message,
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="grid gap-8">
    <section class="soft-panel rounded-[2rem] p-6">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Статистика участника</p>
      <h1 class="mt-2 text-4xl font-black">Мои результаты</h1>
      <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Здесь собрана история ваших игр: набранные очки, место в таблице и количество участников в каждой игре.
      </p>
    </section>

    <LoadingSpinner v-if="loading" />
    <HistoryTable v-else title="История игр" :rows="history" :columns="historyColumns" />
  </div>
</template>
