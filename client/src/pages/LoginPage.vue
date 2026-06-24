<script setup>
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import AuthForm from '../components/AuthForm.vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const auth = useAuth()
const toast = useToast()
const submitError = ref('')

async function handleLogin(payload) {
  submitError.value = ''

  try {
    const user = await auth.login({
      email: payload.email,
      password: payload.password,
    })

    router.push(route.query.next || getHomeRoute(user.role))
  } catch (error) {
    submitError.value = error.message
    toast.showToast({
      title: 'Не удалось войти',
      message: error.message,
      type: 'error',
    })
  }
}

function getHomeRoute(role) {
  return role === 'organizer' ? '/organizer' : '/participant'
}
</script>

<template>
  <div class="grid min-h-[calc(100vh-5rem)] gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
    <section class="soft-panel rounded-[2rem] p-8">
      <p class="text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Ответория</p>
      <h1 class="mt-3 max-w-xl text-5xl font-black leading-none text-[var(--ink)] sm:text-6xl">
        Онлайн-платформа для квизов и викторин.
      </h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
        Здесь организаторы собирают свои квизы, открывают игровые комнаты и проводят живые игры, а участники быстро подключаются по коду и отвечают на вопросы в общем темпе.
      </p>
    </section>

    <div>
      <AuthForm mode="login" :loading="auth.state.loading" @submit="handleLogin" />
      <p class="mt-4 text-center text-sm text-[var(--muted)]">
        Нет аккаунта?
        <RouterLink class="font-semibold text-[var(--accent-deep)]" to="/register">Зарегистрируйтесь</RouterLink>
      </p>
    </div>
  </div>
</template>
