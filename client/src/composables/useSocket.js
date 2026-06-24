import { reactive, readonly } from 'vue'
import { io } from 'socket.io-client'

const socketState = reactive({
  connected: false,
  lastError: null,
})

let socket = null
let activeToken = null

export function useSocket() {
  function connect(token) {
    if (!token) {
      throw new Error('Socket token is required')
    }

    if (socket && activeToken === token) {
      return socket
    }

    if (socket) {
      socket.disconnect()
    }

    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      auth: { token },
      autoConnect: true,
    })

    activeToken = token

    socket.on('connect', () => {
      socketState.connected = true
    })

    socket.on('disconnect', () => {
      socketState.connected = false
    })

    socket.on('session:error', (payload) => {
      socketState.lastError = payload
    })

    return socket
  }

  function disconnect() {
    if (socket) {
      socket.disconnect()
    }

    socket = null
    activeToken = null
    socketState.connected = false
  }

  function subscribe(eventName, handler) {
    if (!socket) {
      return () => {}
    }

    socket.on(eventName, handler)
    return () => socket?.off(eventName, handler)
  }

  function emitWithAck(eventName, payload) {
    if (!socket) {
      return Promise.resolve({
        ok: false,
        code: 'UNAUTHORIZED',
        message: 'Socket is not connected',
      })
    }

    return new Promise((resolve) => {
      socket.emit(eventName, payload, resolve)
    })
  }

  return {
    socket: () => socket,
    state: readonly(socketState),
    connect,
    disconnect,
    subscribe,
    emitWithAck,
  }
}

