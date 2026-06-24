<script setup>
defineProps({
  roomCode: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <section class="soft-panel rounded-[2rem] p-6 text-center">
    <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Код комнаты</p>
    <p class="mt-3 text-5xl font-black tracking-[0.28em] text-[var(--accent-deep)]">{{ roomCode || '------' }}</p>
    <p class="mt-2 text-sm text-[var(--muted)]">Сообщите этот код участникам.</p>
  </section>
</template>
