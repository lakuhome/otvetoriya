<script setup>
const props = defineProps({
  option: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])
</script>

<template>
  <button
    type="button"
    class="rounded-[1.5rem] border px-5 py-4 text-left text-base font-semibold transition"
    :class="selected ? 'border-[var(--accent)] bg-[linear-gradient(135deg,rgba(225,241,255,0.95),rgba(203,228,255,0.9))] text-[var(--accent-deep)] shadow-[0_16px_28px_rgba(98,149,215,0.18)]' : 'border-[var(--line)] bg-white/68 text-[var(--ink)] hover:border-[var(--accent)]'"
    :disabled="disabled"
    @click="emit('toggle', option.id)"
  >
    {{ option.text }}
  </button>
</template>
