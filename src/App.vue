<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useFlashcardsStore } from '@/stores/flashcards'

// Initialize Store
const store = useFlashcardsStore()

// State
const clozeText = ref('')
const clozeNotes = ref('')
const qaQuestion = ref('')
const qaAnswer = ref('')
const searchQuery = ref('')
const editingCardId = ref(null)

// Toast Feedback System
const toast = ref({ show: false, message: '', type: 'success' })
let toastTimeout = null

function showToast(message, type = 'success') {
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }
  toast.value = { show: true, message, type }
  toastTimeout = setTimeout(() => {
    toast.value.show = false
  }, 3500)
}

// Textarea Ref for Cloze Selector
const clozeTextareaRef = ref(null)

// Initialize theme and load cards
onMounted(() => {
  store.loadFromLocalStorage()
  store.initializeTheme()
})

// Filtered cards computed getter
const filteredFlashcards = computed(() => {
  if (!searchQuery.value.trim()) {
    return store.flashcards
  }
  const query = searchQuery.value.toLowerCase()
  return store.flashcards.filter(
    (card) => card.front.toLowerCase().includes(query) || card.back.toLowerCase().includes(query),
  )
})

// Smart Cloze insertion logic
function insertCloze() {
  const textarea = clozeTextareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = clozeText.value

  const selectedText = text.substring(start, end)

  // Count existing {{cX::}} markers in the text to determine the next cloze number
  const clozeRegex = /\{\{c(\d+)::/g
  let match
  let maxNum = 0
  while ((match = clozeRegex.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    if (num > maxNum) {
      maxNum = num
    }
  }
  const nextClozeNum = maxNum + 1

  // If nothing is selected, we create an empty cloze at the cursor
  const replacement = `{{c${nextClozeNum}::${selectedText}}}`
  clozeText.value = text.substring(0, start) + replacement + text.substring(end)

  // Reset focus and position selection after replacement
  nextTick(() => {
    textarea.focus()
    const newCursorPos = start + replacement.length
    textarea.setSelectionRange(newCursorPos, newCursorPos)
  })
}

// Add or save card edit
function handleSubmit() {
  if (store.currentMode === 'cloze') {
    if (!clozeText.value.trim()) return

    if (editingCardId.value) {
      store.editFlashcard(editingCardId.value, {
        front: clozeText.value,
        back: clozeNotes.value,
      })
      editingCardId.value = null
      showToast('Flashcard atualizado com sucesso!')
    } else {
      store.addFlashcard({
        type: 'cloze',
        front: clozeText.value,
        back: clozeNotes.value,
      })
      showToast('Flashcard adicionado com sucesso!')
    }

    clozeText.value = ''
    clozeNotes.value = ''
  } else {
    if (!qaQuestion.value.trim() || !qaAnswer.value.trim()) return

    if (editingCardId.value) {
      store.editFlashcard(editingCardId.value, {
        front: qaQuestion.value,
        back: qaAnswer.value,
      })
      editingCardId.value = null
      showToast('Flashcard atualizado com sucesso!')
    } else {
      store.addFlashcard({
        type: 'qa',
        front: qaQuestion.value,
        back: qaAnswer.value,
      })
      showToast('Flashcard adicionado com sucesso!')
    }

    qaQuestion.value = ''
    qaAnswer.value = ''
  }
}

// Load card details for editing
function handleEdit(card) {
  editingCardId.value = card.id
  store.currentMode = card.type

  if (card.type === 'cloze') {
    clozeText.value = card.front
    clozeNotes.value = card.back
  } else {
    qaQuestion.value = card.front
    qaAnswer.value = card.back
  }

  // Smooth scroll to top of page/editor on mobile
  window.scrollTo({ top: 0, behavior: 'smooth' })
  showToast('Flashcard carregado para edição.', 'info')
}

// Cancel card edit mode
function cancelEdit() {
  editingCardId.value = null
  clozeText.value = ''
  clozeNotes.value = ''
  qaQuestion.value = ''
  qaAnswer.value = ''
  showToast('Edição cancelada.', 'info')
}

// Remove card with feedback
function handleRemove(id) {
  store.removeFlashcard(id)
  showToast('Flashcard removido com sucesso!', 'warning')
}

// Clear all cards with confirmation
function handleClear() {
  if (confirm('Tem certeza de que deseja apagar todos os flashcards da lista?')) {
    store.clearFlashcards()
    showToast('Lista de flashcards limpa!', 'warning')
  }
}

// Export cards with status feedback
function handleExport() {
  const success = store.exportToCSV()
  if (success) {
    showToast('CSV exportado com sucesso!')
  } else {
    showToast('Não há flashcards para exportar.', 'error')
  }
}

// Highlights cloze brackets in preview template
function formatClozeText(text) {
  if (!text) return ''
  // Replaces {{cX::text}} with styled html span
  return text.replace(
    /\{\{c\d+::(.*?)\}\}/g,
    '<span class="bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium border border-indigo-200/50 dark:border-indigo-900/50">$1</span>',
  )
}

// Quick clean editor text
function clearEditor() {
  if (store.currentMode === 'cloze') {
    clozeText.value = ''
    clozeNotes.value = ''
  } else {
    qaQuestion.value = ''
    qaAnswer.value = ''
  }
  showToast('Campos do editor limpos.', 'info')
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-24 md:pb-6"
  >
    <!-- Main Container wrapper -->
    <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
      <!-- HEADER DINÂMICO -->
      <header
        class="w-full glass-effect rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-500/5"
      >
        <div class="flex items-center gap-3">
          <!-- App Logo / Symbol -->
          <div
            class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-bold text-xl"
          >
            A
          </div>
          <div>
            <h1
              class="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent font-display"
            >
              Anki Flashcards Builder
            </h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Estudos & Repetição Espaçada
            </p>
          </div>
        </div>

        <!-- ADSENSE PLACEHOLDER (Adaptável) -->
        <div
          class="flex-1 max-w-sm sm:max-w-md lg:max-w-lg w-full h-12 bg-slate-200/40 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center overflow-hidden relative group transition-colors duration-300"
        >
          <span
            class="text-[10px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider"
            >Espaço Publicitário (AdSense)</span
          >
          <div
            class="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
        </div>

        <!-- THEME TOGGLE (Dark Mode) -->
        <button
          @click="store.toggleDarkMode"
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all duration-300 cursor-pointer min-h-[44px] min-w-[44px]"
          aria-label="Alternar Tema"
        >
          <!-- Sun Icon (Show in dark mode) -->
          <svg
            v-if="store.isDarkMode"
            class="w-5 h-5 animate-pulse"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
            ></path>
          </svg>
          <!-- Moon Icon (Show in light mode) -->
          <svg
            v-else
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            ></path>
          </svg>
        </button>
      </header>

      <!-- ÁREA DE TRABALHO RESPONSIVA -->
      <main class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
        <!-- COLUNA ESQUERDA: EDITORES (Cloze ou Q&A) -->
        <section class="lg:col-span-7 flex flex-col gap-6">
          <div
            class="glass-effect rounded-2xl p-5 md:p-6 shadow-xl shadow-indigo-500/5 flex flex-col gap-6 border border-white/20 dark:border-slate-800/30"
          >
            <!-- Editor Title & Status -->
            <div
              class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4"
            >
              <div>
                <h2 class="text-lg font-bold tracking-tight flex items-center gap-2">
                  <span
                    v-if="editingCardId"
                    class="inline-flex h-2 w-2 rounded-full bg-amber-500 animate-ping"
                  ></span>
                  <span>{{ editingCardId ? 'Editar Flashcard' : 'Criar Flashcard' }}</span>
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  Escolha o modo de formatação abaixo
                </p>
              </div>
              <span
                v-if="editingCardId"
                class="text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/50"
              >
                Modo Edição
              </span>
            </div>

            <!-- MENU DE MODOS (Tabs) -->
            <div
              class="bg-slate-100/80 dark:bg-slate-900/80 p-1.5 rounded-xl flex items-center justify-between gap-2 border border-slate-200/40 dark:border-slate-800/40"
            >
              <button
                @click="store.currentMode = 'cloze'"
                :class="[
                  'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer min-h-[44px] flex items-center justify-center gap-2',
                  store.currentMode === 'cloze'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ]"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m-4-3h9M3 13h18M3 13a9 9 0 000 18h18a9 9 0 000-18"
                  ></path>
                </svg>
                Omissão (Cloze)
              </button>

              <button
                @click="store.currentMode = 'qa'"
                :class="[
                  'flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer min-h-[44px] flex items-center justify-center gap-2',
                  store.currentMode === 'qa'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md shadow-slate-200/50 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ]"
              >
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  ></path>
                </svg>
                Frente/Verso (Q&A)
              </button>
            </div>

            <!-- CONTEÚDO DOS EDITORES -->
            <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
              <!-- 1. MODO OMISSÃO (CLOZE) -->
              <div v-if="store.currentMode === 'cloze'" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                  <div class="flex justify-between items-center">
                    <label
                      for="clozeText"
                      class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >Texto Principal</label
                    >
                    <span class="text-xs text-slate-400 dark:text-slate-500"
                      >{{ clozeText.length }} caracteres</span
                    >
                  </div>
                  <div class="relative">
                    <textarea
                      id="clozeText"
                      ref="clozeTextareaRef"
                      v-model="clozeText"
                      rows="6"
                      placeholder="Cole o artigo da lei ou resumo aqui. Selecione o termo importante e clique no botão 'Criar Omissão' para ocultá-lo."
                      class="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 resize-y"
                    ></textarea>
                  </div>
                </div>

                <!-- Botão de Omissão -->
                <div class="flex justify-start">
                  <button
                    type="button"
                    @click="insertCloze"
                    class="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-200 dark:hover:border-indigo-900/40 font-semibold text-xs flex items-center gap-2 transition-all duration-300 min-h-[44px] cursor-pointer"
                  >
                    <span class="text-base text-indigo-500 font-mono font-bold">{...}</span>
                    Criar Omissão (&#x7b;&#x7b;c1::termo&#x7d;&#x7d;)
                  </button>
                </div>

                <!-- Notas Adicionais/Contexto -->
                <div class="flex flex-col gap-1.5 mt-2">
                  <label
                    for="clozeNotes"
                    class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >Notas / Explicação Adicional (Opcional)</label
                  >
                  <textarea
                    id="clozeNotes"
                    v-model="clozeNotes"
                    rows="3"
                    placeholder="Adicione mnemônicos, fundamentação legal ou anotações extras para ver no verso do flashcard."
                    class="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 resize-y"
                  ></textarea>
                </div>
              </div>

              <!-- 2. MODO FRENTE/VERSO (Q&A) -->
              <div v-else class="flex flex-col gap-4">
                <!-- Pergunta (Frente) -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex justify-between items-center">
                    <label
                      for="qaQuestion"
                      class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >Frente (Pergunta)</label
                    >
                    <span class="text-xs text-slate-400 dark:text-slate-500"
                      >{{ qaQuestion.length }} caracteres</span
                    >
                  </div>
                  <textarea
                    id="qaQuestion"
                    v-model="qaQuestion"
                    rows="3"
                    placeholder="Ex: Quais são os princípios fundamentais da República Federativa do Brasil?"
                    class="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 resize-y"
                  ></textarea>
                </div>

                <!-- Resposta (Verso) -->
                <div class="flex flex-col gap-1.5">
                  <div class="flex justify-between items-center">
                    <label
                      for="qaAnswer"
                      class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >Verso (Resposta)</label
                    >
                    <span class="text-xs text-slate-400 dark:text-slate-500"
                      >{{ qaAnswer.length }} caracteres</span
                    >
                  </div>
                  <textarea
                    id="qaAnswer"
                    v-model="qaAnswer"
                    rows="4"
                    placeholder="Ex: Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, pluralismo político."
                    class="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300 resize-y"
                  ></textarea>
                </div>
              </div>

              <!-- BOTÕES DE AÇÃO DO EDITOR -->
              <div class="flex flex-col sm:flex-row items-center gap-3 mt-2">
                <!-- Submit Card -->
                <button
                  type="submit"
                  class="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-300 cursor-pointer min-h-[44px]"
                >
                  {{ editingCardId ? 'Salvar Alterações' : 'Adicionar à Lista' }}
                </button>

                <!-- Cancel Edit button -->
                <button
                  v-if="editingCardId"
                  type="button"
                  @click="cancelEdit"
                  class="w-full sm:w-auto py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all duration-300 cursor-pointer min-h-[44px]"
                >
                  Cancelar Edição
                </button>

                <!-- Clear text button -->
                <button
                  v-else
                  type="button"
                  @click="clearEditor"
                  class="w-full sm:w-auto py-3 px-6 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium text-sm transition-all duration-300 cursor-pointer min-h-[44px]"
                >
                  Limpar Campos
                </button>
              </div>
            </form>
          </div>

          <!-- DICAS DE ATALHOS / INFORMAÇÕES EXTRAS -->
          <div
            class="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-3"
          >
            <svg
              class="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div>
              <p class="font-bold mb-1">Dica de Importação no Anki:</p>
              <p>
                Ao exportar a lista em .CSV, abra o Anki, clique em
                <strong>"Importar arquivo"</strong>, escolha o arquivo baixado e garanta que o
                mapeamento está configurado: Campo 1 mapeia para a Frente do card e Campo 2 para o
                Verso (ou Notas Extras para o tipo Omissão).
              </p>
            </div>
          </div>
        </section>

        <!-- COLUNA DIREITA: LISTA DE REVISÃO -->
        <section class="lg:col-span-5 flex flex-col gap-6 lg:sticky lg:top-6">
          <div
            class="glass-effect rounded-2xl p-5 md:p-6 shadow-xl shadow-indigo-500/5 flex flex-col gap-4 border border-white/20 dark:border-slate-800/30"
          >
            <!-- List Header with Stats -->
            <div
              class="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-4"
            >
              <div>
                <h2 class="text-lg font-bold tracking-tight">Lista de Revisão</h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">Preview dos cards gerados</p>
              </div>

              <!-- Badges de Contagem -->
              <div class="flex gap-2">
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                >
                  {{ store.totalCards }} cards
                </span>
              </div>
            </div>

            <!-- Search and Filter Bar -->
            <div v-if="store.totalCards > 0" class="flex gap-2">
              <div class="relative flex-1">
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Pesquisar nos cards..."
                  class="w-full bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 min-h-[38px]"
                />
                <svg
                  class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>

              <!-- Limpar Lista -->
              <button
                @click="handleClear"
                class="px-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 border border-red-200/50 dark:border-red-900/30 text-red-600 dark:text-red-400 font-semibold text-xs transition-all duration-300 cursor-pointer min-h-[38px] flex items-center justify-center gap-1"
                title="Limpar todos os cards"
              >
                Limpar
              </button>
            </div>

            <!-- CARDS GRID/LIST (Scrollable container) -->
            <div class="max-h-[420px] overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-1">
              <!-- Empty State -->
              <div
                v-if="filteredFlashcards.length === 0"
                class="flex flex-col items-center justify-center py-12 px-4 text-center"
              >
                <div
                  class="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 mb-3 border border-slate-200/50 dark:border-slate-800/50"
                >
                  <svg
                    class="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    ></path>
                  </svg>
                </div>
                <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {{
                    store.totalCards === 0
                      ? 'Nenhum flashcard criado'
                      : 'Nenhum resultado encontrado'
                  }}
                </p>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[240px]">
                  {{
                    store.totalCards === 0
                      ? 'Escreva no editor e clique em adicionar para compor sua lista de revisão.'
                      : 'Ajuste sua busca ou limpe o campo de pesquisa.'
                  }}
                </p>
              </div>

              <!-- List Elements -->
              <div
                v-for="card in filteredFlashcards"
                :key="card.id"
                class="p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 shadow-sm flex flex-col gap-3 group relative glow-card transition-all duration-300"
              >
                <!-- Card header: Type Badge & Actions -->
                <div class="flex items-center justify-between">
                  <span
                    :class="[
                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                      card.type === 'cloze'
                        ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-900/30'
                        : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-900/30',
                    ]"
                  >
                    {{ card.type === 'cloze' ? 'Omissão' : 'Frente/Verso' }}
                  </span>

                  <!-- Actions -->
                  <div
                    class="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity"
                  >
                    <!-- Edit -->
                    <button
                      @click="handleEdit(card)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Editar flashcard"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        ></path>
                      </svg>
                    </button>
                    <!-- Delete -->
                    <button
                      @click="handleRemove(card.id)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                      title="Remover flashcard"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Card Content Preview -->
                <div class="flex flex-col gap-2 text-xs">
                  <!-- Front / Text -->
                  <div>
                    <span
                      class="font-bold text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5"
                    >
                      {{ card.type === 'cloze' ? 'Texto' : 'Pergunta' }}
                    </span>
                    <!-- Format Cloze to display brackets styled -->
                    <p
                      v-if="card.type === 'cloze'"
                      class="text-slate-700 dark:text-slate-300 font-medium leading-relaxed break-words"
                      v-html="formatClozeText(card.front)"
                    ></p>
                    <p
                      v-else
                      class="text-slate-700 dark:text-slate-300 font-medium leading-relaxed break-words"
                    >
                      {{ card.front }}
                    </p>
                  </div>

                  <!-- Back / Notes -->
                  <div v-if="card.back">
                    <span
                      class="font-bold text-slate-400 dark:text-slate-500 block text-[9px] uppercase tracking-wider mb-0.5"
                    >
                      {{ card.type === 'cloze' ? 'Notas Extras' : 'Resposta' }}
                    </span>
                    <p class="text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                      {{ card.back }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- EXPORTAR CTA (Desktop version visible inside review sidebar) -->
            <div
              class="hidden md:block border-t border-slate-200/60 dark:border-slate-800/60 pt-4 mt-2"
            >
              <button
                @click="handleExport"
                :disabled="store.totalCards === 0"
                class="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-900 disabled:shadow-none disabled:cursor-not-allowed disabled:text-slate-500 dark:disabled:text-slate-600 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <!-- CSV icon -->
                <svg
                  class="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  ></path>
                </svg>
                Exportar CSV para o Anki
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- EXPORTAR CTA MOBILE-FIRST (Sticky floating bar at the bottom for quick touch access) -->
    <div
      class="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-900/80 z-30 flex gap-4 shadow-2xl"
    >
      <button
        @click="handleExport"
        :disabled="store.totalCards === 0"
        class="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-900 disabled:shadow-none disabled:cursor-not-allowed disabled:text-slate-500 dark:disabled:text-slate-600 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          ></path>
        </svg>
        <span>Exportar CSV ({{ store.totalCards }} cards)</span>
      </button>
    </div>

    <!-- Toast Notification (Premium layout, floating bottom-left or top-right) -->
    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toast.show"
        class="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl px-4 py-3 max-w-sm backdrop-blur-md transition-all duration-300"
      >
        <div
          :class="[
            'w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse',
            toast.type === 'success'
              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'
              : toast.type === 'warning'
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                : toast.type === 'error'
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]',
          ]"
        ></div>
        <span class="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-snug">{{
          toast.message
        }}</span>
      </div>
    </transition>
  </div>
</template>
