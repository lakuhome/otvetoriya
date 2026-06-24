<script setup>
import AnswerOptionButton from './AnswerOptionButton.vue'

const props = defineProps({
  question: {
    type: Object,
    default: null,
  },
  selectedOptionIds: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <section v-if="question" class="soft-panel rounded-[2rem] p-6">
    <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Вопрос {{ question.position }}</p>
    <h2 class="mt-3 text-2xl font-black text-[var(--ink)]">{{ question.text || 'Вопрос с изображением' }}</h2>
    <p class="mt-2 text-sm text-[var(--muted)]">
      {{ question.type === 'multiple' ? 'Выберите все подходящие варианты.' : 'Выберите один вариант ответа.' }}
    </p>

    <img
      v-if="question.imageUrl"
      :src="question.imageUrl"
      alt="Иллюстрация к вопросу"
      class="mt-5 max-h-80 w-full rounded-[1.5rem] object-cover"
    />

    <div class="mt-6 grid gap-3">
      <AnswerOptionButton
        v-for="option in question.options"
        :key="option.id"
        :option="option"
        :selected="selectedOptionIds.includes(option.id)"
        :disabled="disabled"
        @toggle="emit('toggle', $event)"
      />
    </div>
  </section>
</template>
