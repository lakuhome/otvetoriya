import { apiRequest } from './fetchClient'

export function createSession(quizId) {
  return apiRequest(`/quizzes/${quizId}/sessions`, {
    method: 'POST',
    body: {},
  })
}

export function getSessionByCode(roomCode) {
  return apiRequest(`/sessions/by-code/${roomCode}`)
}

export function getSessionState(sessionId) {
  return apiRequest(`/sessions/${sessionId}`)
}

export function getSessionResults(sessionId) {
  return apiRequest(`/sessions/${sessionId}/results`)
}

export function getParticipantHistory() {
  return apiRequest('/history/participated')
}

export function getHostedHistory() {
  return apiRequest('/history/hosted')
}

