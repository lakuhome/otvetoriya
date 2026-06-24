<script setup>
defineProps({
  title: {
    type: String,
    default: 'Не удалось выполнить действие',
  },
  message: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-red-900 shadow-sm">
    <p class="text-sm font-semibold">{{ title }}</p>
    <p class="mt-1 text-sm">{{ message }}</p>
  </div>
</template>
