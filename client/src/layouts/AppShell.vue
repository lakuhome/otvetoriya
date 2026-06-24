<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppHeader from '../components/AppHeader.vue'
import ToastStack from '../components/ToastStack.vue'

const route = useRoute()
const showHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="grain min-h-screen text-[var(--ink)]">
    <AppHeader v-if="showHeader" />
    <ToastStack />
    <main class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  </div>
</template>
