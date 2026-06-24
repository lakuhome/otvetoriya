<script setup>
defineProps({
  entries: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <section class="soft-panel rounded-[2rem] p-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Результаты</p>
        <h3 class="mt-2 text-xl font-black">Турнирная таблица</h3>
      </div>
    </div>

    <div v-if="entries.length" class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="text-[var(--muted)]">
          <tr>
            <th class="pb-3 font-semibold">Место</th>
            <th class="pb-3 font-semibold">Участник</th>
            <th class="pb-3 font-semibold">Очки</th>
            <th class="pb-3 font-semibold">Верно</th>
            <th class="pb-3 font-semibold">Время</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.participantId" class="border-t border-[var(--line)]">
            <td class="py-3 font-black text-[var(--accent-deep)]">{{ entry.place }}</td>
            <td class="py-3 font-semibold">{{ entry.nickname }}</td>
            <td class="py-3">{{ entry.score }}</td>
            <td class="py-3">{{ entry.correctAnswers }}</td>
            <td class="py-3">{{ entry.totalResponseTimeMs }} мс</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="mt-5 text-sm text-[var(--muted)]">
      Итоги появятся после завершения игры.
    </p>
  </section>
</template>
