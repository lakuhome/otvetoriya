<script setup>
import { useToast } from '../composables/useToast'

const toast = useToast()
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6">
    <transition-group name="toast">
      <div
        v-for="item in toast.state.items"
        :key="item.id"
        class="pointer-events-auto rounded-[1.5rem] border px-4 py-3 shadow-lg backdrop-blur"
        :class="
          item.type === 'error'
            ? 'border-red-200 bg-red-50/95 text-red-900'
            : item.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
              : 'border-[var(--line)] bg-white/95 text-[var(--ink)]'
        "
      >
        <p v-if="item.title" class="text-sm font-black">{{ item.title }}</p>
        <p class="text-sm" :class="item.title ? 'mt-1' : ''">{{ item.message }}</p>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
