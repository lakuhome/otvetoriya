<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LeaderboardTable from '../components/LeaderboardTable.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import ParticipantList from '../components/ParticipantList.vue'
import QuestionView from '../components/QuestionView.vue'
import QuizTimer from '../components/QuizTimer.vue'
import RoomCodeCard from '../components/RoomCodeCard.vue'
import { useAuth } from '../composables/useAuth'
import { useSocket } from '../composables/useSocket'
import { useToast } from '../composables/useToast'
import { getSessionState } from '../api/sessionsApi'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const socketApi = useSocket()
const toast = useToast()

const loading = ref(true)
const submitting = ref(false)
const selectedOptionIds = ref([])
const sessionState = reactive({
  session: null,
  participants: [],
  leaderboard: [],
  currentQuestion: null,
  hasSubmittedCurrentQuestion: false,
})

let unsubscribers = []

const sessionId = computed(() => Number(route.params.id || route.params.sessionId))
const isOrganizer = computed(() => auth.user.value?.role === 'organizer')
const canStart = computed(() => sessionState.session?.status === 'lobby')
const canNext = computed(() => sessionState.session?.status === 'question_closed')
const canFinish = computed(
  () => sessionState.session && sessionState.session.status !== 'finished'
)

onMounted(async () => {
  await auth.initAuth()
  await openRealtimeSession()
})

onBeforeUnmount(() => {
  cleanupSocketSubscriptions()
  socketApi.disconnect()
})

async function openRealtimeSession() {
  loading.value = true

  try {
    socketApi.connect(auth.token.value)
    registerSocketListeners()

    const acknowledgement = isOrganizer.value
      ? await socketApi.emitWithAck('session:sync', { sessionId: sessionId.value })
      : await socketApi.emitWithAck('room:join', {
          roomCode: route.query.roomCode,
        })

    if (!acknowledgement.ok) {
      throw new Error(acknowledgement.message)
    }

    applyState(acknowledgement.state)
    await refreshState()
  } catch (error) {
    toast.showToast({
      title: 'Не удалось открыть комнату',
      message: error.message,
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

function registerSocketListeners() {
  cleanupSocketSubscriptions()

  unsubscribers = [
    socketApi.subscribe('room:state', applyState),
    socketApi.subscribe('question:opened', async () => {
      selectedOptionIds.value = []
      toast.showToast({
        title: 'Новый вопрос',
        message: 'Вопрос открыт, можно отвечать.',
      })
      await refreshState()
    }),
    socketApi.subscribe('question:closed', async () => {
      toast.showToast({
        title: 'Время вышло',
        message: 'Прием ответов на вопрос завершен.',
      })
      await refreshState()
    }),
    socketApi.subscribe('leaderboard:updated', (entries) => {
      sessionState.leaderboard = entries
    }),
    socketApi.subscribe('quiz:finished', async () => {
      toast.showToast({
        title: 'Игра завершена',
        message: 'Можно перейти к итоговым результатам.',
        type: 'success',
      })
      await refreshState()
    }),
    socketApi.subscribe('participant:joined', async () => {
      await refreshState()
    }),
    socketApi.subscribe('participant:left', async () => {
      await refreshState()
    }),
    socketApi.subscribe('answer:accepted', (payload) => {
      toast.showToast({
        title: 'Ответ принят',
        message: payload.message,
        type: 'success',
      })
      sessionState.hasSubmittedCurrentQuestion = true
    }),
    socketApi.subscribe('answer:rejected', (payload) => {
      toast.showToast({
        title: 'Не удалось отправить ответ',
        message: payload.message,
        type: 'error',
      })
    }),
  ]
}

function cleanupSocketSubscriptions() {
  unsubscribers.forEach((unsubscribe) => unsubscribe())
  unsubscribers = []
}

async function refreshState() {
  const response = await getSessionState(sessionId.value)
  applyState(response)
}

function applyState(payload) {
  sessionState.session = payload.session
  sessionState.participants = payload.participants || []
  sessionState.leaderboard = payload.leaderboard || []
  sessionState.currentQuestion = payload.currentQuestion
  sessionState.hasSubmittedCurrentQuestion = Boolean(payload.hasSubmittedCurrentQuestion)
}

function toggleOption(optionId) {
  if (!sessionState.currentQuestion) {
    return
  }

  if (sessionState.currentQuestion.type === 'single') {
    selectedOptionIds.value = [optionId]
    return
  }

  if (selectedOptionIds.value.includes(optionId)) {
    selectedOptionIds.value = selectedOptionIds.value.filter((id) => id !== optionId)
    return
  }

  selectedOptionIds.value = [...selectedOptionIds.value, optionId]
}

async function startOrNext(eventName) {
  const acknowledgement = await socketApi.emitWithAck(eventName, {
    sessionId: sessionId.value,
  })

  if (!acknowledgement.ok) {
    toast.showToast({
      title: 'Не удалось выполнить действие',
      message: acknowledgement.message,
      type: 'error',
    })
    return
  }

  applyState(acknowledgement.state)
}

async function submitAnswer() {
  submitting.value = true

  try {
    const acknowledgement = await socketApi.emitWithAck('answer:submit', {
      sessionId: sessionId.value,
      questionId: sessionState.currentQuestion.id,
      optionIds: selectedOptionIds.value,
    })

    if (!acknowledgement.ok) {
      throw new Error(acknowledgement.message)
    }

    if (acknowledgement.state) {
      applyState(acknowledgement.state)
    }
  } catch (error) {
    toast.showToast({
      title: 'Не удалось отправить ответ',
      message: error.message,
      type: 'error',
    })
  } finally {
    submitting.value = false
  }
}

async function finishGame() {
  const acknowledgement = await socketApi.emitWithAck('host:finish', {
    sessionId: sessionId.value,
  })

  if (!acknowledgement.ok) {
    toast.showToast({
      title: 'Не удалось завершить игру',
      message: acknowledgement.message,
      type: 'error',
    })
    return
  }

  router.push(isOrganizer.value ? `/organizer/sessions/${sessionId.value}/results` : `/game/${sessionId.value}/results`)
}
</script>

<template>
  <div class="grid gap-8">
    <section class="soft-panel rounded-[2rem] p-6">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Игровая комната</p>
      <h1 class="mt-2 text-4xl font-black">{{ sessionState.session?.quizTitle || 'Игровая комната' }}</h1>
    </section>

    <LoadingSpinner v-if="loading" />

    <template v-else>
      <div class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr_0.9fr]">
        <RoomCodeCard :room-code="sessionState.session?.roomCode" />
        <QuizTimer :ends-at="sessionState.session?.questionEndsAt" />
        <ParticipantList :participants="sessionState.participants" />
      </div>

      <div v-if="isOrganizer" class="flex flex-wrap gap-3">
        <button v-if="canStart" class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)]" @click="startOrNext('host:start')">
          Запустить первый вопрос
        </button>
        <button v-if="canNext" class="rounded-2xl border border-white/35 bg-white/54 px-5 py-3 font-black text-[var(--ink)] shadow-[0_12px_22px_rgba(108,147,197,0.12)]" @click="startOrNext('host:next-question')">
          Открыть следующий вопрос
        </button>
        <button v-if="canFinish" class="rounded-2xl border border-red-200/85 bg-white/42 px-5 py-3 font-semibold text-red-700" @click="finishGame">
          Завершить квиз
        </button>
      </div>

      <QuestionView
        v-if="sessionState.currentQuestion"
        :question="sessionState.currentQuestion"
        :selected-option-ids="selectedOptionIds"
        :disabled="isOrganizer || sessionState.hasSubmittedCurrentQuestion || sessionState.session?.status !== 'question_open'"
        @toggle="toggleOption"
      />

      <div
        v-if="!isOrganizer && sessionState.currentQuestion && sessionState.session?.status === 'question_open'"
        class="flex flex-wrap gap-3"
      >
        <button
          class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
          :disabled="selectedOptionIds.length === 0 || sessionState.hasSubmittedCurrentQuestion || submitting"
          @click="submitAnswer"
        >
          {{ sessionState.hasSubmittedCurrentQuestion ? 'Ответ уже отправлен' : submitting ? 'Отправляем...' : 'Отправить ответ' }}
        </button>
      </div>

      <div
        v-if="sessionState.session?.status === 'question_closed'"
        class="soft-panel rounded-[1.75rem] p-5 text-sm text-[var(--muted)]"
      >
        Прием ответов на этот вопрос завершен.
      </div>

      <div
        v-if="sessionState.session?.status === 'finished'"
        class="soft-panel rounded-[1.75rem] p-5 text-sm text-[var(--muted)]"
      >
        Игра завершена. Итоги показаны ниже.
      </div>

      <LeaderboardTable
        v-if="sessionState.leaderboard?.length"
        :entries="sessionState.leaderboard"
      />
    </template>
  </div>
</template>
