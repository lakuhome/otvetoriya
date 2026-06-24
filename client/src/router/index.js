import { createRouter, createWebHistory } from 'vue-router'

import { useAuth } from '../composables/useAuth'
import GamePage from '../pages/GamePage.vue'
import JoinRoomPage from '../pages/JoinRoomPage.vue'
import LoginPage from '../pages/LoginPage.vue'
import OrganizerDashboardPage from '../pages/OrganizerDashboardPage.vue'
import ParticipantStatsPage from '../pages/ParticipantStatsPage.vue'
import QuizEditorPage from '../pages/QuizEditorPage.vue'
import RegisterPage from '../pages/RegisterPage.vue'
import ResultsPage from '../pages/ResultsPage.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
    meta: { hideHeader: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { guestOnly: true, hideHeader: true },
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage,
    meta: { guestOnly: true, hideHeader: true },
  },
  {
    path: '/organizer',
    name: 'organizer-home',
    component: OrganizerDashboardPage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/organizer/quizzes',
    name: 'organizer-quizzes',
    component: OrganizerDashboardPage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/organizer/quizzes/new',
    name: 'organizer-quiz-new',
    component: QuizEditorPage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/organizer/quizzes/:id/edit',
    name: 'organizer-quiz-edit',
    component: QuizEditorPage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/organizer/sessions/:id',
    name: 'organizer-session',
    component: GamePage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/organizer/sessions/:id/results',
    name: 'organizer-results',
    component: ResultsPage,
    meta: { requiresAuth: true, requiresRole: 'organizer' },
  },
  {
    path: '/participant',
    name: 'participant-home',
    redirect: '/participant/room',
    meta: { requiresAuth: true, requiresRole: 'participant' },
  },
  {
    path: '/participant/room',
    name: 'participant-room',
    component: JoinRoomPage,
    meta: { requiresAuth: true, requiresRole: 'participant' },
  },
  {
    path: '/participant/stats',
    name: 'participant-stats',
    component: ParticipantStatsPage,
    meta: { requiresAuth: true, requiresRole: 'participant' },
  },
  {
    path: '/join',
    name: 'join-room',
    redirect: '/participant/room',
  },
  {
    path: '/game/:sessionId',
    name: 'game',
    component: GamePage,
    meta: { requiresAuth: true },
  },
  {
    path: '/game/:sessionId/results',
    name: 'game-results',
    component: ResultsPage,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuth()
  await auth.initAuth()

  const user = auth.user.value

  if (to.meta.guestOnly && user) {
    return getHomeRouteByRole(user.role)
  }

  if (to.meta.requiresAuth && !user) {
    return {
      name: 'login',
      query: { next: to.fullPath },
    }
  }

  if (to.meta.requiresRole && user?.role !== to.meta.requiresRole) {
    return getHomeRouteByRole(user?.role)
  }

  return true
})

function getHomeRouteByRole(role) {
  if (role === 'organizer') {
    return { name: 'organizer-home' }
  }

  return { name: 'participant-home' }
}

export default router
