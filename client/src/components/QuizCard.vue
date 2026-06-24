<script setup>
const props = defineProps({
  quiz: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['edit', 'start', 'delete'])
</script>

<template>
  <article class="soft-panel rounded-[1.9rem] p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-xl font-black text-[var(--ink)]">{{ props.quiz.title }}</h3>
        <p class="mt-2 max-w-xl text-sm text-[var(--muted)]">
          {{ props.quiz.description || 'Описание пока не добавлено.' }}
        </p>
      </div>

      <div class="rounded-2xl border border-white/40 bg-white/56 px-4 py-3 text-right shadow-[0_12px_26px_rgba(109,154,211,0.14)]">
        <p class="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Вопросов</p>
        <p class="text-2xl font-black text-[var(--accent-deep)]">{{ props.quiz.questionCount || 0 }}</p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <span
        v-for="category in props.quiz.categories || []"
        :key="category.id"
        class="rounded-full border border-white/45 bg-white/56 px-3 py-1 text-xs font-semibold text-[var(--muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
      >
        {{ category.name }}
      </span>
    </div>

    <div class="mt-5 flex flex-wrap gap-3">
      <button class="rounded-full border border-white/35 bg-white/56 px-4 py-2 text-sm font-semibold text-[var(--ink)]" @click="emit('edit', props.quiz)">
        Редактировать
      </button>
      <button
        class="rounded-full border border-white/35 bg-[linear-gradient(135deg,rgba(105,186,255,0.96),rgba(34,108,218,0.94))] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="props.quiz.status === 'archived' || (props.quiz.questionCount || 0) === 0"
        @click="emit('start', props.quiz)"
      >
        Запустить комнату
      </button>
      <button class="rounded-full border border-red-200/80 bg-white/42 px-4 py-2 text-sm font-semibold text-red-700" @click="emit('delete', props.quiz)">
        Удалить
      </button>
    </div>
  </article>
</template>
