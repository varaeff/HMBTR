<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)
const links = [
  {
    title: 'Главная',
    url: '/',
    exact: true
  },
  {
    title: 'Список бойцов',
    url: '/fighters'
  },
  {
    title: 'Турниры',
    url: '/tournaments'
  }
]
</script>

<template>
  <nav class="fixed left-0 top-0 w-full z-100 bg-black/30 backdrop-blur-sm px-4">
    <div class="flex items-center justify-between h-fit lg:h-auto">
      <button @click="isOpen = !isOpen" class="lg:hidden p-3 text-white focus:outline-none">
        <div class="w-6 h-5 relative flex flex-col justify-between">
          <span
            :class="[
              'h-0.5 w-full bg-white transition-all',
              isOpen ? 'rotate-45 translate-y-2' : ''
            ]"
          ></span>
          <span
            :class="['h-0.5 w-full bg-white transition-opacity', isOpen ? 'opacity-0' : '']"
          ></span>
          <span
            :class="[
              'h-0.5 w-full bg-white transition-all',
              isOpen ? '-rotate-45 -translate-y-2' : ''
            ]"
          ></span>
        </div>
      </button>

      <ul
        :class="[
          'flex transition-all duration-300 ease-in-out',
          'fixed lg:static top-13 left-0 w-[50%] lg:w-auto bg-black/50 lg:bg-transparent flex-col lg:flex-row p-4 lg:p-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ]"
      >
        <li
          v-for="link in links"
          :key="link.url"
          class="group relative px-4.5 py-2 font-bold cursor-pointer whitespace-nowrap list-none"
        >
          <div
            class="absolute inset-0 -z-10 rounded-[5px] transition-all duration-200 group-hover:bg-linear-to-b group-hover:from-[#e8edec] group-hover:to-[#d2d1d3]"
          ></div>

          <RouterLink
            :to="link.url"
            @click="isOpen = false"
            class="text-white! block transition-colors duration-200 group-hover:text-black! [&.router-link-exact-active]:text-black!"
          >
            {{ link.title }}
          </RouterLink>
        </li>
      </ul>
    </div>
  </nav>
</template>
