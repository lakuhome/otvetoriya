import { apiRequest } from './fetchClient'

export function listQuizzes() {
  return apiRequest('/quizzes')
}

export function getQuiz(quizId) {
  return apiRequest(`/quizzes/${quizId}`)
}

export function createQuiz(payload) {
  return apiRequest('/quizzes', {
    method: 'POST',
    body: payload,
  })
}

export function updateQuiz(quizId, payload) {
  return apiRequest(`/quizzes/${quizId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteQuiz(quizId) {
  return apiRequest(`/quizzes/${quizId}`, {
    method: 'DELETE',
  })
}

export function createQuestion(quizId, payload) {
  return apiRequest(`/quizzes/${quizId}/questions`, {
    method: 'POST',
    body: payload,
  })
}

export function updateQuestion(questionId, payload) {
  return apiRequest(`/questions/${questionId}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteQuestion(questionId) {
  return apiRequest(`/questions/${questionId}`, {
    method: 'DELETE',
  })
}

export function reorderQuestions(quizId, questionIds) {
  return apiRequest(`/quizzes/${quizId}/questions/order`, {
    method: 'PATCH',
    body: { questionIds },
  })
}

export function listCategories() {
  return apiRequest('/categories')
}

