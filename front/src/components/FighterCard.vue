<script setup lang="ts">
import { onMounted, ref } from 'vue'
import NoPhoto from '@/entities/NoPhoto.jpg'

const props = defineProps({
  name: String,
  description: String,
  pic: String
})

const cardContentRef = ref<HTMLElement | null>(null)
const glossRef = ref<HTMLElement | null>(null)

const mapNumberRange = (n: number, a: number, b: number, c: number, d: number): number => {
  return ((n - a) * (d - c)) / (b - a) + c
}

const handleMouseMove = (e: MouseEvent) => {
  if (!cardContentRef.value || !glossRef.value) return

  const pointerX = e.clientX
  const pointerY = e.clientY

  const cardRect = cardContentRef.value.getBoundingClientRect()

  const halfWidth = cardRect.width / 2
  const halfHeight = cardRect.height / 2

  const cardCenterX = cardRect.left + halfWidth
  const cardCenterY = cardRect.top + halfHeight

  const deltaX = pointerX - cardCenterX
  const deltaY = pointerY - cardCenterY

  const distanceToCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  const maxDistance = Math.max(halfWidth, halfHeight)

  const degree = mapNumberRange(distanceToCenter, 0, maxDistance, 0, 10)

  const rx = mapNumberRange(deltaY, 0, halfWidth, 0, 1)
  const ry = mapNumberRange(deltaX, 0, halfHeight, 0, 1)

  cardContentRef.value.style.transform = `perspective(400px) rotate3d(${-rx}, ${ry}, 0, ${degree}deg)`
  glossRef.value.style.transform = `translate(${-ry * 100}%, ${-rx * 100}%) scale(2.4)`
  glossRef.value.style.opacity = `${mapNumberRange(distanceToCenter, 0, maxDistance, 0, 0.6)}`
}

const handleMouseLeave = () => {
  if (cardContentRef.value && glossRef.value) {
    cardContentRef.value.style.transform = ''
    glossRef.value.style.opacity = '0'
  }
}

onMounted(() => {
  if (glossRef.value) {
    requestAnimationFrame(() => {
      glossRef.value!.classList.add('card__gloss--animatable')
    })
  }
})
</script>

<template>
  <div class="card" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
    <div class="card__content" ref="cardContentRef">
      <div class="card__gloss" ref="glossRef"></div>
      <img class="card__image" :src="props.pic ? props.pic : NoPhoto" :alt="props.name" />
      <h2 class="card__title">{{ props.name }}</h2>
      <p class="card__description">{{ props.description }}</p>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  background-color: #96a7b0;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.card {
  padding: 10px;
  cursor: pointer;
  width: 20%;
  min-width: 250px;
}

.card__image {
  aspect-ratio: 16 / 9;
  width: 100%;
  object-fit: cover;
}

.card__content {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.1),
    0 8px 10px -6px rgb(0 0 0 / 0.1);
  background: whitesmoke;
  border-radius: 10px;
  width: 100%;
  max-width: 300px;
  will-change: transform;
  transition: transform 0.25s ease-out;
}

.card__title {
  color: hsl(201, 14%, 20%);
  font-size: 20px;
  padding: 10px 14px 5px;
  margin: 0;
}

.card__description {
  margin: 0;
  padding: 0 14px 10px;
  font-size: 14px;
  color: hsl(201, 14%, 40%);
  text-align: left;
}

.card__gloss {
  opacity: 0;
  z-index: 10;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 1) 0%,
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  position: absolute;
  will-change: opacity;
}

.card__gloss.card__gloss--animatable {
  transition: 0.25s opacity ease-out;
}
</style>
