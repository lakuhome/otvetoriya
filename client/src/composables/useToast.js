import { reactive, readonly } from 'vue'

const toastState = reactive({
  items: [],
})

let nextToastId = 1

export function useToast() {
  function showToast({ title = '', message = '', type = 'info', duration = 2600 }) {
    if (!message) {
      return
    }

    const id = nextToastId
    nextToastId += 1

    toastState.items.push({
      id,
      title,
      message,
      type,
    })

    if (duration > 0) {
      window.setTimeout(() => dismissToast(id), duration)
    }
  }

  function dismissToast(id) {
    const index = toastState.items.findIndex((item) => item.id === id)

    if (index !== -1) {
      toastState.items.splice(index, 1)
    }
  }

  return {
    state: readonly(toastState),
    showToast,
    dismissToast,
  }
}
