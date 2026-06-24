<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import HistoryTable from '../components/HistoryTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import QuizCard from '../components/QuizCard.vue'
import { useToast } from '../composables/useToast'
import { getHostedHistory, createSession } from '../api/sessionsApi'
import { deleteQuiz, listQuizzes } from '../api/quizzesApi'

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const actionLoadingId = ref(null)
const quizzes = ref([])
const hostedHistory = ref([])

const historyColumns = [
  { key: 'quizTitle', label: 'Квиз' },
  { key: 'participantsCount', label: 'Участники' },
  { key: 'winnerName', label: 'Победитель' },
]

onMounted(loadData)

async function loadData() {
  loading.value = true

    try {
      const [quizzesResponse, historyResponse] = await Promise.all([
        listQuizzes(),
        getHostedHistory(),
      ])

    quizzes.value = quizzesResponse.quizzes.filter((quiz) => quiz.status !== 'archived')
    hostedHistory.value = historyResponse.history
  } catch (error) {
    toast.showToast({
      title: 'Не удалось загрузить кабинет',
      message: error.message,
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

function handleEdit(quiz) {
  router.push(`/organizer/quizzes/${quiz.id}/edit`)
}

async function handleStart(quiz) {
  actionLoadingId.value = quiz.id

  try {
    const session = await createSession(quiz.id)
    router.push(`/organizer/sessions/${session.sessionId}`)
  } catch (error) {
    toast.showToast({
      title: 'Не удалось запустить комнату',
      message: error.message,
      type: 'error',
    })
  } finally {
    actionLoadingId.value = null
  }
}

async function handleDelete(quiz) {
  if (!window.confirm(`Удалить квиз "${quiz.title}"?`)) {
    return
  }

  actionLoadingId.value = quiz.id

  try {
    await deleteQuiz(quiz.id)
    await loadData()
  } catch (error) {
    toast.showToast({
      title: 'Не удалось удалить квиз',
      message: error.message,
      type: 'error',
    })
  } finally {
    actionLoadingId.value = null
  }
}
</script>

<template>
  <div class="grid gap-8">
    <section class="soft-panel rounded-[2rem] p-6 sm:p-8">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Кабинет организатора</p>
          <h1 class="mt-2 text-4xl font-black">Мои квизы</h1>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Здесь можно создавать квизы, запускать комнаты и смотреть результаты прошедших игр.
          </p>
        </div>

        <button class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)]" @click="router.push('/organizer/quizzes/new')">
          Создать новый квиз
        </button>
      </div>
    </section>

    <LoadingSpinner v-if="loading" />

    <section v-else class="grid gap-5">
      <QuizCard
        v-for="quiz in quizzes"
        :key="quiz.id"
        :quiz="quiz"
        @edit="handleEdit"
        @start="handleStart"
        @delete="handleDelete"
      />

      <p v-if="quizzes.length === 0" class="soft-panel rounded-[1.75rem] p-5 text-sm text-[var(--muted)]">
        У вас пока нет квизов. Создайте первый и добавьте в него вопросы.
      </p>
    </section>

    <HistoryTable title="История организатора" :rows="hostedHistory" :columns="historyColumns" />
  </div>
</template>
