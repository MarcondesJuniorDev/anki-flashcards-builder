import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useFlashcardsStore = defineStore('flashcards', () => {
  // --- STATE ---
  const flashcards = ref([])
  const isDarkMode = ref(false)
  const currentMode = ref('cloze') // 'cloze' or 'qa'

  // --- ACTIONS ---

  // Load initial state from LocalStorage
  function loadFromLocalStorage() {
    const storedCards = localStorage.getItem('anki-flashcards')
    if (storedCards) {
      try {
        flashcards.value = JSON.parse(storedCards)
      } catch (e) {
        console.error('Error parsing stored flashcards:', e)
        flashcards.value = []
      }
    } else {
      // Load demo sample cards for first-time premium user experience
      flashcards.value = [
        {
          id: 'sample-1',
          type: 'cloze',
          front:
            'A República Federativa do Brasil constitui-se em {{c1::Estado Democrático de Direito}} e tem como fundamento a {{c2::dignidade da pessoa humana}}.',
          back: 'Artigo 1º, inciso III da Constituição Federal de 1988.',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sample-2',
          type: 'qa',
          front: 'Qual o prazo de validade do concurso público segundo a CF/88?',
          back: 'Até 2 (dois) anos, prorrogável uma vez, por igual período (Art. 37, III).',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sample-3',
          type: 'cloze',
          front:
            'É garantido o direito de {{c1::greve}}, cabendo aos {{c2::trabalhadores}} decidir sobre a oportunidade de exercê-lo.',
          back: 'Artigo 9º da Constituição Federal de 1988.',
          createdAt: new Date().toISOString(),
        },
      ]
      saveToLocalStorage()
    }
  }

  // Save state to LocalStorage
  function saveToLocalStorage() {
    localStorage.setItem('anki-flashcards', JSON.stringify(flashcards.value))
  }

  // Initialize Theme (Dark Mode)
  function initializeTheme() {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      isDarkMode.value = savedTheme === 'dark'
    } else {
      isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    updateThemeClass()
  }

  // Update DOM class and save theme choice
  function updateThemeClass() {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Toggle Theme
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
    updateThemeClass()
  }

  // Add a new Flashcard
  function addFlashcard({ type, front, back }) {
    if (!front || !front.trim()) return

    const newCard = {
      id: Date.now().toString(),
      type,
      front: front.trim(),
      back: back ? back.trim() : '',
      createdAt: new Date().toISOString(),
    }

    // Add to the beginning of the list for immediate visibility
    flashcards.value.unshift(newCard)
    saveToLocalStorage()
  }

  // Remove a Flashcard
  function removeFlashcard(id) {
    flashcards.value = flashcards.value.filter((card) => card.id !== id)
    saveToLocalStorage()
  }

  // Update/Edit a Flashcard
  function editFlashcard(id, { front, back }) {
    const index = flashcards.value.findIndex((card) => card.id === id)
    if (index !== -1) {
      flashcards.value[index].front = front.trim()
      flashcards.value[index].back = back ? back.trim() : ''
      saveToLocalStorage()
    }
  }

  // Clear all Flashcards
  function clearFlashcards() {
    flashcards.value = []
    saveToLocalStorage()
  }

  // Helper to escape fields for RFC 4180 CSV formatting
  function escapeCSVField(val) {
    if (val === undefined || val === null) return '""'
    let str = String(val)
    // Replace double-quotes with two double-quotes
    str = str.replace(/"/g, '""')
    // Wrap in double-quotes
    return `"${str}"`
  }

  // Export Flashcards to CSV file
  function exportToCSV() {
    if (flashcards.value.length === 0) return false

    // Generate CSV content
    // We use a headerless CSV or header-based.
    // For Anki, importing a CSV without headers is very common. We can just provide Front and Back.
    // Let's also include a note about Card Type if needed, but standard Anki import usually maps columns.
    // Let's export: "Front/Question/Text", "Back/Answer/Extra Notes"
    const csvRows = flashcards.value.map((card) => {
      return [escapeCSVField(card.front), escapeCSVField(card.back)].join(',')
    })

    const csvContent = '\uFEFF' + csvRows.join('\n') // Add BOM for Excel Portuguese compatibility
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    // Create temporary download element
    const link = document.createElement('a')
    link.href = url

    const dateStr = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `anki-flashcards-${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    return true
  }

  // --- GETTERS ---
  const totalCards = computed(() => flashcards.value.length)
  const clozeCardsCount = computed(() => flashcards.value.filter((c) => c.type === 'cloze').length)
  const qaCardsCount = computed(() => flashcards.value.filter((c) => c.type === 'qa').length)

  return {
    flashcards,
    isDarkMode,
    currentMode,
    totalCards,
    clozeCardsCount,
    qaCardsCount,
    loadFromLocalStorage,
    initializeTheme,
    toggleDarkMode,
    addFlashcard,
    removeFlashcard,
    editFlashcard,
    clearFlashcards,
    exportToCSV,
  }
})
