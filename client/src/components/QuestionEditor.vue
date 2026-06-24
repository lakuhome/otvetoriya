<script setup>
import { reactive, watch } from 'vue'

import AnswerOptionEditor from './AnswerOptionEditor.vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Новый вопрос',
  },
  categories: {
    type: Array,
    default: () => [],
  },
  initialValue: {
    type: Object,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['save', 'cancel'])

const form = reactive(createForm(props.initialValue))

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(form, createForm(value))
  },
  { deep: true }
)

function addOption() {
  form.options.push({
    text: '',
    isCorrect: false,
  })
}

function removeOption(index) {
  form.options.splice(index, 1)
}

function handleSubmit() {
  emit('save', {
    text: form.text,
    imageUrl: form.imageUrl || null,
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    type: form.type,
    points: Number(form.points),
    options: form.options.map((option) => ({
      text: option.text,
      isCorrect: Boolean(option.isCorrect),
    })),
  })
}

function createForm(value) {
  return {
    text: value?.text || '',
    imageUrl: value?.imageUrl || '',
    categoryId: value?.categoryId || '',
    type: value?.type || 'single',
    points: value?.points || 100,
    options: value?.options?.length
      ? value.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect }))
      : [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
  }
}
</script>

<template>
  <div class="soft-panel rounded-[2rem] p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Вопрос</p>
        <h3 class="mt-2 text-2xl font-black">{{ title }}</h3>
      </div>

      <button type="button" class="rounded-full border border-white/35 bg-white/52 px-4 py-2 text-sm font-semibold text-[var(--muted)]" @click="emit('cancel')">
        Закрыть
      </button>
    </div>

    <form class="mt-5 grid gap-4" @submit.prevent="handleSubmit">
      <label class="grid gap-2">
        <span class="text-sm font-semibold">Текст вопроса</span>
        <textarea v-model="form.text" rows="3" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Введите текст вопроса"></textarea>
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-2">
          <span class="text-sm font-semibold">URL изображения</span>
          <input v-model="form.imageUrl" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="https://example.com/image.jpg" />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-semibold">Категория</span>
          <select v-model="form.categoryId" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="">Без категории</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-2">
          <span class="text-sm font-semibold">Тип ответа</span>
          <select v-model="form.type" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="single">Один правильный ответ</option>
            <option value="multiple">Несколько правильных ответов</option>
          </select>
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-semibold">Баллы</span>
          <input v-model="form.points" type="number" min="1" max="10000" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
      </div>

      <div class="grid gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">Варианты ответа</span>
          <button type="button" class="rounded-full border border-white/35 bg-white/52 px-4 py-2 text-sm font-semibold text-[var(--muted)]" @click="addOption">
            Добавить вариант
          </button>
        </div>

        <AnswerOptionEditor
          v-for="(option, index) in form.options"
          :key="index"
          :option="option"
          :index="index"
          @remove="removeOption(index)"
        />
      </div>

      <button
        type="submit"
        class="rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
        :disabled="loading"
      >
        {{ loading ? 'Сохраняем вопрос...' : 'Сохранить вопрос' }}
      </button>
    </form>
  </div>
</template>
