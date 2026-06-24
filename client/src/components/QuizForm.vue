<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  initialValue: {
    type: Object,
    default: () => ({
      title: '',
      description: '',
      rules: '',
      timePerQuestionSeconds: 20,
      categoryIds: [],
    }),
  },
  categories: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  submitLabel: {
    type: String,
    default: 'Сохранить квиз',
  },
})

const emit = defineEmits(['save'])

const form = reactive(createForm(props.initialValue))

watch(
  () => props.initialValue,
  (value) => {
    Object.assign(form, createForm(value))
  },
  { deep: true }
)

function toggleCategory(categoryId) {
  if (form.categoryIds.includes(categoryId)) {
    form.categoryIds = form.categoryIds.filter((item) => item !== categoryId)
    return
  }

  form.categoryIds = [...form.categoryIds, categoryId]
}

function handleSubmit() {
  emit('save', {
    title: form.title,
    description: form.description,
    rules: form.rules,
    timePerQuestionSeconds: Number(form.timePerQuestionSeconds),
    categoryIds: form.categoryIds,
  })
}

function createForm(value) {
  return {
    title: value?.title || '',
    description: value?.description || '',
    rules: value?.rules || '',
    timePerQuestionSeconds: value?.timePerQuestionSeconds || 20,
    categoryIds: Array.isArray(value?.categoryIds) ? [...value.categoryIds] : [],
  }
}
</script>

<template>
  <form class="soft-panel rounded-[2rem] p-6" @submit.prevent="handleSubmit">
    <div class="grid gap-4">
      <label class="grid gap-2">
        <span class="text-sm font-semibold">Название</span>
        <input v-model="form.title" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Например, Вечерний квиз" />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold">Описание</span>
        <textarea v-model="form.description" rows="3" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Коротко опиши тему квиза"></textarea>
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold">Правила</span>
        <textarea v-model="form.rules" rows="3" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Например: один ответ на вопрос, без подсказок"></textarea>
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold">Время на один вопрос</span>
        <input v-model="form.timePerQuestionSeconds" type="number" min="5" max="300" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <div class="grid gap-3">
        <span class="text-sm font-semibold">Категории</span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            class="rounded-full border px-4 py-2 text-sm font-semibold transition"
            :class="form.categoryIds.includes(category.id) ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-deep)] shadow-[0_10px_18px_rgba(101,162,231,0.16)]' : 'border-[var(--line)] bg-white/52 text-[var(--muted)]'"
            @click="toggleCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </div>
      </div>
    </div>

    <button
      type="submit"
      class="mt-6 rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 font-black text-white shadow-[0_16px_30px_rgba(73,130,202,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
      :disabled="loading"
    >
      {{ loading ? 'Сохраняем квиз...' : submitLabel }}
    </button>
  </form>
</template>
