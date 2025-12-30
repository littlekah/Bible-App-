// Estado da aplicação
let bibleData = null;
let currentBook = null;
let currentChapter = null;
let bookClickCount = 0;
let lastClickedBook = null;

// Elementos DOM
const menuScreen = document.getElementById('menuScreen');
const readScreen = document.getElementById('readScreen');
const loadingScreen = document.getElementById('loadingScreen');

const testamentSelect = document.getElementById('testamentSelect');
const bookSelect = document.getElementById('bookSelect');
const chapterSelect = document.getElementById('chapterSelect');
const readBtn = document.getElementById('readBtn');

const backBtn = document.getElementById('backBtn');
const readTitle = document.getElementById('readTitle');
const chapterText = document.getElementById('chapterText');
const reference = document.getElementById('reference');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// Controle de música
const bgMusic = document.getElementById('bgMusic');

// Criar Web Audio para música ambient calma
function initAudioContext() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Gerar tom ambient suave usando oscillators
  const now = audioContext.currentTime;
  const duration = 8; // 8 segundos de loop
  
  // Criar envelope ADSR para suavidade
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(0.1, now + 0.5);
  envelope.gain.setValueAtTime(0.1, now + duration - 0.5);
  envelope.gain.linearRampToValueAtTime(0, now + duration);
  
  // Tom baixo (C3 = 130.81 Hz)
  const osc1 = audioContext.createOscillator();
  osc1.frequency.value = 130.81;
  osc1.type = 'sine';
  
  // Tom médio (E3 = 164.81 Hz)
  const osc2 = audioContext.createOscillator();
  osc2.frequency.value = 164.81;
  osc2.type = 'sine';
  
  // Tom alto (G3 = 196 Hz)
  const osc3 = audioContext.createOscillator();
  osc3.frequency.value = 196;
  osc3.type = 'sine';
  
  // Mixer
  const mixer = audioContext.createGain();
  mixer.gain.value = 0.30; // Volume baixo
  
  osc1.connect(mixer);
  osc2.connect(mixer);
  osc3.connect(mixer);
  mixer.connect(envelope);
  envelope.connect(audioContext.destination);
  
  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
  
  // Loop
  setTimeout(() => initAudioContext(), duration * 1000);
}

// Inicializar aplicação
async function init() {
  try {
    const response = await fetch('bible.json');
    bibleData = await response.json();
    setupEventListeners();
    
    // Iniciar música ambient na primeira interação
    document.addEventListener('click', () => {
      if (bgMusic.paused) {
        bgMusic.play().catch(() => {
          try {
            initAudioContext();
          } catch (e) {
            console.log('Web Audio não disponível');
          }
        });
      }
    }, { once: true });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

function setupEventListeners() {
  testamentSelect.addEventListener('change', onTestamentChange);
  bookSelect.addEventListener('click', onBookClick);
  chapterSelect.addEventListener('change', onChapterChange);
  readBtn.addEventListener('click', startReading);
  backBtn.addEventListener('click', goBack);
  prevBtn.addEventListener('click', readPrevious);
  nextBtn.addEventListener('click', readNext);
}

function onTestamentChange() {
  const testament = testamentSelect.value;
  bookSelect.innerHTML = '<option value="">Selecione um livro</option>';
  chapterSelect.innerHTML = '<option value="">Selecione um livro primeiro</option>';
  bookSelect.disabled = !testament;
  chapterSelect.disabled = true;
  readBtn.disabled = true;
  
  if (testament) {
    const books = bibleData.livros.filter(b => b.testamento === testament);
    books.forEach(book => {
      const option = document.createElement('option');
      option.value = book.nome;
      option.textContent = book.nome;
      bookSelect.appendChild(option);
    });
  }
}

function onBookClick() {
  const bookName = bookSelect.value;
  
  // Resetar contadores se é um livro diferente
  if (lastClickedBook !== bookName) {
    bookClickCount = 0;
    lastClickedBook = bookName;
  }
  
  if (!bookName) return;
  
  bookClickCount++;
  
  // Primeira vez: apenas mostra que foi selecionado
  if (bookClickCount === 1) {
    chapterSelect.innerHTML = '<option value="">Clique novamente no livro para ver os capítulos</option>';
    chapterSelect.disabled = true;
    readBtn.disabled = true;
  }
  // Segunda vez: mostra os capítulos
  else if (bookClickCount >= 2) {
    chapterSelect.innerHTML = '<option value="">Selecione um capítulo</option>';
    chapterSelect.disabled = false;
    
    const book = bibleData.livros.find(b => b.nome === bookName);
    for (let i = 1; i <= book.capitulos; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Capítulo ${i}`;
      chapterSelect.appendChild(option);
    }
    
    // Resetar contador para próximo clique
    bookClickCount = 0;
  }
}

function onChapterChange() {
  readBtn.disabled = !chapterSelect.value;
}

async function startReading() {
  currentBook = bookSelect.value;
  currentChapter = parseInt(chapterSelect.value);
  
  if (!currentBook || !currentChapter) return;
  
  showScreen('loading');
  await loadChapter();
  showScreen('read');
}

async function loadChapter() {
  try {
    // Usar a API bible-api.com para buscar o texto em português
    const response = await fetch(`https://bible-api.com/${currentBook} ${currentChapter}?translation=almeida`);
    const data = await response.json();
    
    // Construir o título
    const book = bibleData.livros.find(b => b.nome === currentBook);
    readTitle.textContent = `${currentBook} ${currentChapter}`;
    reference.textContent = `${data.reference || `${currentBook} ${currentChapter}`}`;
    
    // Processar e exibir o texto
    if (data.verses) {
      chapterText.innerHTML = data.verses
        .map(verse => `
          <div class="verse">
            <span class="verse-number">${verse.verse}</span>
            ${verse.text}
          </div>
        `).join('');
    } else if (data.text) {
      chapterText.textContent = data.text;
    } else {
      chapterText.textContent = 'Capítulo não encontrado. Tente outro.';
    }
    
    // Atualizar botões de navegação
    const book = bibleData.livros.find(b => b.nome === currentBook);
    prevBtn.disabled = currentChapter <= 1;
    nextBtn.disabled = currentChapter >= book.capitulos;
    
  } catch (error) {
    console.error('Erro ao carregar capítulo:', error);
    chapterText.textContent = 'Erro ao carregar capítulo. Verifique sua conexão.';
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }
}

async function readPrevious() {
  if (currentChapter > 1) {
    currentChapter--;
    chapterSelect.value = currentChapter;
    showScreen('loading');
    await loadChapter();
    showScreen('read');
    chapterText.scrollTop = 0;
  }
}

async function readNext() {
  const book = bibleData.livros.find(b => b.nome === currentBook);
  if (currentChapter < book.capitulos) {
    currentChapter++;
    chapterSelect.value = currentChapter;
    showScreen('loading');
    await loadChapter();
    showScreen('read');
    chapterText.scrollTop = 0;
  }
}

function goBack() {
  showScreen('menu');
}

function showScreen(screenName) {
  menuScreen.classList.add('hidden');
  readScreen.classList.add('hidden');
  loadingScreen.classList.add('hidden');
  
  if (screenName === 'menu') {
    menuScreen.classList.remove('hidden');
  } else if (screenName === 'read') {
    readScreen.classList.remove('hidden');
  } else if (screenName === 'loading') {
    loadingScreen.classList.remove('hidden');
  }
}

// Iniciar aplicação quando o documento está pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
