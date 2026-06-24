<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  rows: {
    type: Array,
    default: () => [],
  },
  columns: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="soft-panel rounded-[2rem] p-6">
    <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">История</p>
    <h3 class="mt-2 text-xl font-black">{{ title }}</h3>

    <div v-if="rows.length" class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="text-[var(--muted)]">
          <tr>
            <th v-for="column in columns" :key="column.key" class="pb-3 font-semibold">
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="row.sessionId || index" class="border-t border-[var(--line)]">
            <td v-for="column in columns" :key="column.key" class="py-3">
              {{ row[column.key] }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="mt-5 text-sm text-[var(--muted)]">
      Пока здесь ничего нет.
    </p>
  </section>
</template>
