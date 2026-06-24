<script setup>
defineProps({
  option: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['remove'])
</script>

<template>
  <div class="grid gap-3 rounded-2xl border border-[var(--line)] bg-white/80 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
    <input v-model="option.text" class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" :placeholder="`Вариант ${index + 1}`" />
    <label class="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
      <input v-model="option.isCorrect" type="checkbox" class="h-4 w-4 rounded border-[var(--line)]" />
      Правильный ответ
    </label>
    <button type="button" class="rounded-full border border-red-200 px-3 py-2 text-sm font-semibold text-red-700" @click="emit('remove')">
      Удалить
    </button>
  </div>
</template>
