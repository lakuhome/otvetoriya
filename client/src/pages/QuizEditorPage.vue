<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LoadingSpinner from '../components/LoadingSpinner.vue'
import QuestionEditor from '../components/QuestionEditor.vue'
import QuizForm from '../components/QuizForm.vue'
import { useToast } from '../composables/useToast'
import {
  createQuestion,
  createQuiz,
  deleteQuestion,
  getQuiz,
  listCategories,
  updateQuestion,
  updateQuiz,
} from '../api/quizzesApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const pageLoading = ref(true)
const saveLoading = ref(false)
const questionLoading = ref(false)
const categories = ref([])
const quiz = ref(null)
const questionEditorOpen = ref(false)
const editingQuestion = ref(null)
const quizForm = ref({
  title: '',
  description: '',
  rules: '',
  timePerQuestionSeconds: 20,
  categoryIds: [],
})

const isNewQuiz = computed(() => !route.params.id)

onMounted(loadPage)

async function loadPage() {
  pageLoading.value = true

  try {
    const categoriesResponse = await listCategories()
    categories.value = categoriesResponse.categories

    if (!isNewQuiz.value) {
      const response = await getQuiz(route.params.id)
      applyQuiz(response.quiz)
    }
  } catch (error) {
    toast.showToast({
      title: 'Не удалось открыть редактор',
      message: error.message,
      type: 'error',
    })
  } finally {
    pageLoading.value = false
  }
}

async function handleSaveQuiz(payload) {
  saveLoading.value = true

  try {
    if (isNewQuiz.value) {
      const response = await createQuiz(payload)
      router.replace(`/organizer/quizzes/${response.quiz.id}/edit`)
      applyQuiz(response.quiz)
      return
    }

    const response = await updateQuiz(route.params.id, payload)
    applyQuiz(response.quiz)
  } catch (error) {
    toast.showToast({
      title: 'Не удалось сохранить квиз',
      message: error.message,
      type: 'error',
    })
  } finally {
    saveLoading.value = false
  }
}

function openNewQuestionEditor() {
  editingQuestion.value = null
  questionEditorOpen.value = true
}

function openEditQuestion(question) {
  editingQuestion.value = {
    ...question,
    options: question.options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
    })),
  }
  questionEditorOpen.value = true
}

async function handleSaveQuestion(payload) {
  if (!quiz.value) {
    toast.showToast({
      title: 'Сначала сохраните квиз',
      message: 'Перед добавлением вопросов нужно сохранить сам квиз.',
      type: 'error',
    })
    return
  }

  questionLoading.value = true

  try {
    const response = editingQuestion.value
      ? await updateQuestion(editingQuestion.value.id, payload)
      : await createQuestion(quiz.value.id, payload)

    applyQuiz(response.quiz)
    editingQuestion.value = null
    questionEditorOpen.value = false
  } catch (error) {
    toast.showToast({
      title: 'Не удалось сохранить вопрос',
      message: error.message,
      type: 'error',
    })
  } finally {
    questionLoading.value = false
  }
}

async function handleDeleteQuestion(question) {
  if (!window.confirm(`Удалить вопрос "${question.text || 'без текста'}"?`)) {
    return
  }

  questionLoading.value = true

  try {
    const response = await deleteQuestion(question.id)
    applyQuiz(response.quiz)
  } catch (error) {
    toast.showToast({
      title: 'Не удалось удалить вопрос',
      message: error.message,
      type: 'error',
    })
  } finally {
    questionLoading.value = false
  }
}

function applyQuiz(nextQuiz) {
  quiz.value = nextQuiz
  quizForm.value = {
    title: nextQuiz.title,
    description: nextQuiz.description || '',
    rules: nextQuiz.rules || '',
    timePerQuestionSeconds: nextQuiz.timePerQuestionSeconds,
    categoryIds: nextQuiz.categories.map((category) => category.id),
  }
}
</script>

<template>
  <div class="grid gap-8">
    <section class="soft-panel rounded-[2rem] p-6">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Редактор квиза</p>
      <h1 class="mt-2 text-4xl font-black">
        {{ isNewQuiz ? 'Создание нового квиза' : `Редактор квиза: ${quiz?.title || ''}` }}
      </h1>
      <p class="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Настройте параметры квиза и добавьте все нужные вопросы.
      </p>
    </section>

    <LoadingSpinner v-if="pageLoading" />

    <template v-else>
      <QuizForm
        :initial-value="quizForm"
        :categories="categories"
        :loading="saveLoading"
        :submit-label="isNewQuiz ? 'Создать квиз' : 'Сохранить изменения'"
        @save="handleSaveQuiz"
      />

      <section class="soft-panel rounded-[2rem] p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Список вопросов</p>
            <h2 class="mt-2 text-2xl font-black">Вопросы квиза</h2>
          </div>
          <button class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)]" @click="openNewQuestionEditor">
            Добавить вопрос
          </button>
        </div>

        <div class="mt-5 grid gap-4">
          <article
            v-for="(question, index) in quiz?.questions || []"
            :key="question.id"
            class="rounded-[1.5rem] border border-[var(--line)] bg-white/85 p-5"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  {{ question.type === 'multiple' ? 'Несколько ответов' : 'Один ответ' }} · Позиция {{ question.position }}
                </p>
                <h3 class="mt-2 text-xl font-black">{{ question.text || 'Вопрос с изображением' }}</h3>
                <p class="mt-2 text-sm text-[var(--muted)]">Баллы: {{ question.points }}</p>
                <ul class="mt-4 grid gap-2 text-sm text-[var(--muted)]">
                  <li v-for="option in question.options" :key="option.id">
                    <span class="font-semibold text-[var(--ink)]">{{ option.text }}</span>
                    <span v-if="option.isCorrect"> · верный</span>
                  </li>
                </ul>
              </div>

              <div class="flex flex-wrap gap-2">
                <button class="rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-4 py-2 text-sm font-semibold text-white" @click="openEditQuestion(question)">
                  Изменить
                </button>
                <button class="rounded-full border border-red-200/85 bg-white/42 px-4 py-2 text-sm font-semibold text-red-700" @click="handleDeleteQuestion(question)">
                  Удалить
                </button>
              </div>
            </div>

            <p class="mt-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              Вопрос {{ index + 1 }} из {{ quiz?.questions?.length || 0 }}
            </p>
          </article>

          <p v-if="(quiz?.questions || []).length === 0" class="rounded-[1.5rem] border border-dashed border-[var(--line)] px-5 py-6 text-sm text-[var(--muted)]">
            В этом квизе пока нет вопросов. Добавьте хотя бы один, чтобы можно было начать игру.
          </p>
        </div>
      </section>

      <QuestionEditor
        v-if="questionEditorOpen"
        :title="editingQuestion ? 'Редактирование вопроса' : 'Новый вопрос'"
        :categories="categories"
        :initial-value="editingQuestion"
        :loading="questionLoading"
        @save="handleSaveQuestion"
        @cancel="questionEditorOpen = false"
      />
    </template>
  </div>
</template>
