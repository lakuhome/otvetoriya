<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  endsAt: {
    type: String,
    default: '',
  },
})

const remainingMs = ref(0)
let intervalId = null

const seconds = computed(() => Math.max(0, Math.ceil(remainingMs.value / 1000)))

watch(
  () => props.endsAt,
  () => {
    sync()
  },
  { immediate: true }
)

onMounted(() => {
  intervalId = window.setInterval(sync, 250)
})

onBeforeUnmount(() => {
  window.clearInterval(intervalId)
})

function sync() {
  if (!props.endsAt) {
    remainingMs.value = 0
    return
  }

  remainingMs.value = new Date(props.endsAt).getTime() - Date.now()
}
</script>

<template>
  <div class="soft-panel rounded-[2rem] p-6 text-center">
    <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Таймер</p>
    <p class="mt-3 text-6xl font-black text-[var(--accent-deep)]">{{ seconds }}</p>
    <p class="mt-2 text-sm text-[var(--muted)]">секунд осталось на ответ</p>
  </div>
</template>
