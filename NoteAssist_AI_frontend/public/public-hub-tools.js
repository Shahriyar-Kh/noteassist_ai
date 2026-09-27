const wordInput = document.querySelector('[data-word-input]');
if (wordInput) {
  const wordCount = document.querySelector('[data-words]');
  const characterCount = document.querySelector('[data-characters]');
  const readingTime = document.querySelector('[data-reading]');
  function update() {
    const value = wordInput.value.trim();
    const words = value ? value.split(/\s+/u).length : 0;
    wordCount.textContent = String(words);
    characterCount.textContent = String(wordInput.value.length);
    readingTime.textContent = String(words ? Math.max(1, Math.ceil(words / 200)) : 0);
  }
  wordInput.addEventListener('input', update);
  update();
}

const timer = document.querySelector('[data-focus-timer]');
if (timer) {
  const display = timer.querySelector('[data-time]');
  const message = timer.querySelector('[data-timer-message]');
  const choices = [...timer.querySelectorAll('[data-minutes]')];
  let minutes = 25;
  let remaining = minutes * 60;
  let endsAt = null;
  let interval = null;
  const render = () => {
    display.textContent = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
    document.title = `${display.textContent} · Focus timer | NoteAssist AI`;
  };
  const pause = () => {
    if (endsAt) remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    endsAt = null;
    clearInterval(interval);
    interval = null;
    render();
  };
  const tick = () => {
    remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
    render();
    if (remaining === 0) {
      pause();
      message.textContent = 'Session complete. Take a break and check what you learned.';
    }
  };
  choices.forEach((choice) => choice.addEventListener('click', () => {
    pause();
    minutes = Number(choice.dataset.minutes);
    remaining = minutes * 60;
    choices.forEach((item) => item.setAttribute('aria-pressed', String(item === choice)));
    message.textContent = 'Write down one thing you want to finish before you start.';
    render();
  }));
  timer.querySelector('[data-start]').addEventListener('click', () => {
    if (interval || !remaining) return;
    endsAt = Date.now() + remaining * 1000;
    interval = setInterval(tick, 250);
    message.textContent = 'Focus on the task you chose.';
  });
  timer.querySelector('[data-pause]').addEventListener('click', pause);
  timer.querySelector('[data-reset]').addEventListener('click', () => {
    pause();
    remaining = minutes * 60;
    message.textContent = 'Write down one thing you want to finish before you start.';
    render();
  });
  render();
}
