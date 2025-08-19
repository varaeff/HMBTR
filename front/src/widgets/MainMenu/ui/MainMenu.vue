<template>
  <ul class="menu-bar">
    <li class="menu-item" v-for="link in links" :key="link.url">
      <RouterLink :to="link.url">{{ link.title }}</RouterLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
const links = [
  {
    title: 'Главная',
    url: '/',
    exact: true
  },
  {
    title: 'Список бойцов',
    url: '/fighters'
  }
]
</script>

<style scoped>
.menu-bar {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: fit-content;
  display: inline-flex;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  align-items: center;
  padding: 0 10px;
  margin: 0 0 0.5rem 0;
  z-index: 100;
}
.menu-item {
  list-style: none;
  font-weight: bold;
  padding: 12px 16px;
  margin: 0 8px;
  position: relative;
  cursor: pointer;
  white-space: nowrap;
}
.menu-item a {
  color: white;
}
.menu-item::before {
  content: ' ';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  z-index: -1;
  transition: 0.2s;
  border-radius: 25px;
}

.router-link-exact-active {
  color: black !important;
}

.menu-item:hover a {
  color: blue !important;
}

.menu-item:hover::before {
  background: linear-gradient(to bottom, #e8edec, #d2d1d3);
  box-shadow: 0px 3px 20px 0px black;
  transform: scale(1.2);
}
</style>
