<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import i18n from 'i18next'
import { ArrowUp } from 'lucide-vue-next'
import englishInstructions from '@/entities/userManual_en.md?raw'
import russianInstructions from '@/entities/userManual_ru.md?raw'

type InstructionLanguage = 'en' | 'ru'

interface InlinePart {
  text: string
  strong: boolean
}

interface ParagraphNode {
  type: 'paragraph'
  parts: InlinePart[]
}

interface HeadingNode {
  type: 'heading'
  text: string
}

interface ListNode {
  type: 'orderedList' | 'unorderedList'
  items: InlinePart[][]
}

type InstructionNode = ParagraphNode | HeadingNode | ListNode

interface InstructionSection {
  id: string
  title: string
  nodes: InstructionNode[]
}

interface InstructionPage {
  title: string
  introNodes: InstructionNode[]
  sections: InstructionSection[]
}

interface ActiveList {
  ordered: boolean
  items: string[]
}

const currentLanguage = ref<InstructionLanguage>(resolveLanguage(i18n.language))

const instructionMarkdown = computed(() =>
  currentLanguage.value === 'en' ? englishInstructions : russianInstructions
)
const instructionPage = computed(() => parseInstructions(instructionMarkdown.value))
const contentsTitle = computed(() => (currentLanguage.value === 'en' ? 'Contents' : 'Содержание'))
const backToContentsText = computed(() =>
  currentLanguage.value === 'en' ? 'Back to contents' : 'К содержанию'
)

const handleLanguageChanged = (language: string): void => {
  currentLanguage.value = resolveLanguage(language)
}

onMounted(() => {
  i18n.on('languageChanged', handleLanguageChanged)
})

onUnmounted(() => {
  i18n.off('languageChanged', handleLanguageChanged)
})

function resolveLanguage(language: string | undefined): InstructionLanguage {
  return language?.startsWith('en') ? 'en' : 'ru'
}

function parseInstructions(markdown: string): InstructionPage {
  const lines = markdown.split(/\r?\n/)
  const introNodes: InstructionNode[] = []
  const sections: InstructionSection[] = []
  let title = ''
  let currentSection: InstructionSection | null = null
  let paragraphLines: string[] = []
  let activeList: ActiveList | null = null

  const getTargetNodes = (): InstructionNode[] => currentSection?.nodes ?? introNodes

  const flushParagraph = (): void => {
    if (paragraphLines.length === 0) {
      return
    }

    getTargetNodes().push({
      type: 'paragraph',
      parts: parseInlineParts(paragraphLines.join(' '))
    })
    paragraphLines = []
  }

  const flushList = (): void => {
    if (!activeList) {
      return
    }

    getTargetNodes().push({
      type: activeList.ordered ? 'orderedList' : 'unorderedList',
      items: activeList.items.map(parseInlineParts)
    })
    activeList = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (line.startsWith('# ')) {
      flushParagraph()
      flushList()
      title = stripMarkdown(line.slice(2))
      continue
    }

    if (line.startsWith('## ')) {
      flushParagraph()
      flushList()

      const sectionTitle = stripMarkdown(line.slice(3))
      currentSection = {
        id: `instruction-section-${sections.length + 1}`,
        title: sectionTitle,
        nodes: []
      }
      sections.push(currentSection)
      continue
    }

    if (line.startsWith('### ')) {
      flushParagraph()
      flushList()
      getTargetNodes().push({
        type: 'heading',
        text: stripMarkdown(line.slice(4))
      })
      continue
    }

    const listMatch = /^(-|\d+\.)\s+(.+)$/.exec(line)
    if (listMatch) {
      flushParagraph()

      const ordered = listMatch[1] !== '-'
      if (!activeList || activeList.ordered !== ordered) {
        flushList()
        activeList = { ordered, items: [] }
      }

      activeList.items.push(listMatch[2])
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return {
    title,
    introNodes,
    sections
  }
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').trim()
}

function parseInlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  const strongPattern = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match = strongPattern.exec(text)

  while (match) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        strong: false
      })
    }

    parts.push({
      text: match[1],
      strong: true
    })

    lastIndex = match.index + match[0].length
    match = strongPattern.exec(text)
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      strong: false
    })
  }

  return parts
}
</script>

<template>
  <main class="min-h-screen bg-background">
    <section class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <header class="mb-4 border-b border-border pb-2">
        <h1 class="max-w-4xl textxl leading-tight font-bold text-foreground">
          {{ instructionPage.title }}
        </h1>
      </header>

      <nav id="instructions-menu" class="mb-4" :aria-label="contentsTitle">
        <h2 class="mb-4 text-lg font-semibold text-foreground">{{ contentsTitle }}</h2>
        <ol class="space-y-1">
          <li v-for="section in instructionPage.sections" :key="section.id">
            <a
              :href="`#${section.id}`"
              class="text-sm font-medium leading-snug text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {{ section.title }}
            </a>
          </li>
        </ol>
      </nav>

      <div
        v-if="instructionPage.introNodes.length > 0"
        class="mb-4 max-w-3xl space-y-2 text-base leading-7 text-muted-foreground"
      >
        <p v-for="(node, index) in instructionPage.introNodes" :key="index">
          <template v-if="node.type === 'paragraph'">
            <template v-for="(part, partIndex) in node.parts" :key="partIndex">
              <strong v-if="part.strong" class="font-semibold text-foreground">{{
                part.text
              }}</strong>
              <span v-else>{{ part.text }}</span>
            </template>
          </template>
        </p>
      </div>

      <div class="space-y-2">
        <article
          v-for="section in instructionPage.sections"
          :id="section.id"
          :key="section.id"
          class="scroll-mt-24"
        >
          <header class="mb-2 border-b border-border pb-2">
            <h2 class="text-lg leading-snug font-semibold text-foreground">
              {{ section.title }}
            </h2>
          </header>

          <div class="space-y-1 text-base leading-7 text-foreground">
            <template v-for="(node, nodeIndex) in section.nodes" :key="nodeIndex">
              <p v-if="node.type === 'paragraph'" class="text-muted-foreground">
                <template v-for="(part, partIndex) in node.parts" :key="partIndex">
                  <strong v-if="part.strong" class="font-semibold text-foreground">{{
                    part.text
                  }}</strong>
                  <span v-else>{{ part.text }}</span>
                </template>
              </p>

              <h3
                v-else-if="node.type === 'heading'"
                class="pt-3 text-lg font-semibold text-foreground"
              >
                {{ node.text }}
              </h3>

              <ol
                v-else-if="node.type === 'orderedList'"
                class="space-y-1 pl-6 text-muted-foreground marker:font-semibold marker:text-primary"
              >
                <li v-for="(item, itemIndex) in node.items" :key="itemIndex" class="pl-1">
                  <template v-for="(part, partIndex) in item" :key="partIndex">
                    <strong v-if="part.strong" class="font-semibold text-foreground">{{
                      part.text
                    }}</strong>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </li>
              </ol>

              <ul v-else class="space-y-1 pl-6 text-muted-foreground marker:text-primary">
                <li v-for="(item, itemIndex) in node.items" :key="itemIndex" class="pl-1">
                  <template v-for="(part, partIndex) in item" :key="partIndex">
                    <strong v-if="part.strong" class="font-semibold text-foreground">{{
                      part.text
                    }}</strong>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </li>
              </ul>
            </template>
          </div>

          <a
            href="#instructions-menu"
            class="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowUp class="size-4" />
            {{ backToContentsText }}
          </a>
        </article>
      </div>
    </section>
  </main>
</template>
