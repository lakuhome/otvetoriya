const activeQuestionTimers = new Map();

function scheduleQuestionClose(sessionId, endsAt, handler) {
  clearQuestionTimer(sessionId);

  const delayMs = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const timeout = setTimeout(async () => {
    activeQuestionTimers.delete(sessionId);
    await handler();
  }, delayMs);

  activeQuestionTimers.set(sessionId, timeout);
}

function clearQuestionTimer(sessionId) {
  const timeout = activeQuestionTimers.get(sessionId);

  if (timeout) {
    clearTimeout(timeout);
    activeQuestionTimers.delete(sessionId);
  }
}

module.exports = {
  scheduleQuestionClose,
  clearQuestionTimer,
};

