<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import AuthForm from '../components/AuthForm.vue'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const router = useRouter()
const auth = useAuth()
const toast = useToast()
const submitError = ref('')

async function handleRegister(payload) {
  submitError.value = ''

  try {
    const user = await auth.register(payload)
    router.push(user.role === 'organizer' ? '/organizer' : '/participant')
  } catch (error) {
    submitError.value = error.message
    toast.showToast({
      title: 'Не удалось зарегистрироваться',
      message: error.message,
      type: 'error',
    })
  }
}
</script>

<template>
  <div class="grid min-h-[calc(100vh-5rem)] gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
    <section class="soft-panel rounded-[2rem] p-8">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Регистрация</p>
      <h1 class="mt-3 text-4xl font-black text-[var(--ink)]">Создайте аккаунт.</h1>
      <p class="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)]">
        Укажите имя, email, пароль и выберите роль.
      </p>
    </section>

    <div>
      <AuthForm mode="register" :loading="auth.state.loading" @submit="handleRegister" />
      <p class="mt-4 text-center text-sm text-[var(--muted)]">
        Уже есть аккаунт?
        <RouterLink class="font-semibold text-[var(--accent-deep)]" to="/login">Вернуться ко входу</RouterLink>
      </p>
    </div>
  </div>
</template>
