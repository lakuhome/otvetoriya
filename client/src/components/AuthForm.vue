<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  mode: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit'])

const form = reactive({
  displayName: '',
  email: '',
  password: '',
  role: 'participant',
})

watch(
  () => props.mode,
  () => {
    form.displayName = ''
    form.email = ''
    form.password = ''
    form.role = 'participant'
  }
)

function handleSubmit() {
  emit('submit', { ...form })
}
</script>

<template>
  <form class="soft-panel rounded-[2.2rem] p-6 sm:p-8" @submit.prevent="handleSubmit">
    <div class="mb-6">
      <p class="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
        {{ mode === 'login' ? 'Вход' : 'Регистрация' }}
      </p>
      <h1 class="mt-2 text-3xl font-black text-[var(--ink)]">
        {{ mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте аккаунт' }}
      </h1>
      <p class="mt-2 max-w-md text-sm text-[var(--muted)]">
        {{ mode === 'login' ? 'Организаторы управляют квизами, а участники подключаются к игре по коду комнаты.' : 'Укажите имя, email, пароль и выберите роль в системе.' }}
      </p>
    </div>

    <div class="mt-5 grid gap-4">
      <label v-if="mode === 'register'" class="grid gap-2">
        <span class="text-sm font-semibold text-[var(--ink)]">Отображаемое имя</span>
        <input
          v-model="form.displayName"
          class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          placeholder="Например, Анна"
        />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-[var(--ink)]">Email</span>
        <input
          v-model="form.email"
          type="email"
          class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          placeholder="user@example.com"
        />
      </label>

      <label class="grid gap-2">
        <span class="text-sm font-semibold text-[var(--ink)]">Пароль</span>
        <input
          v-model="form.password"
          type="password"
          class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
          placeholder="Минимум 6 символов"
        />
      </label>

      <label v-if="mode === 'register'" class="grid gap-2">
        <span class="text-sm font-semibold text-[var(--ink)]">Роль</span>
        <select
          v-model="form.role"
          class="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent)]"
        >
          <option value="participant">Участник</option>
          <option value="organizer">Организатор</option>
        </select>
      </label>
    </div>

    <button
      type="submit"
      class="mt-6 w-full rounded-2xl border border-white/35 bg-[linear-gradient(135deg,rgba(110,191,255,0.96),rgba(34,108,218,0.94))] px-5 py-3 text-base font-black text-white shadow-[0_16px_32px_rgba(73,130,202,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
      :disabled="loading"
    >
      {{ loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться' }}
    </button>
  </form>
</template>
