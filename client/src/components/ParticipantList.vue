<script setup>
defineProps({
  participants: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <section class="soft-panel rounded-[2rem] p-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Игроки</p>
        <h3 class="mt-2 text-xl font-black">Участники</h3>
      </div>
      <span class="rounded-full border border-white/45 bg-white/58 px-3 py-2 text-sm font-semibold text-[var(--accent-deep)] shadow-[0_10px_18px_rgba(108,147,197,0.12)]">
        {{ participants.length }}
      </span>
    </div>

    <div class="mt-5 grid gap-3">
      <div
        v-for="participant in participants"
        :key="participant.participantId"
        class="rounded-2xl border border-[var(--line)] bg-white/85 px-4 py-3"
      >
        <p class="font-semibold">{{ participant.nickname }}</p>
        <p class="text-sm text-[var(--muted)]">Очки: {{ participant.score }}</p>
      </div>

      <p v-if="participants.length === 0" class="text-sm text-[var(--muted)]">
        Пока никто не присоединился.
      </p>
    </div>
  </section>
</template>
