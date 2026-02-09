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
      glossRef.value!.classList.add('transition-opacity', 'duration-[250ms]', 'ease-out')
    })
  }
})
</script>

<template>
  <div
    class="box-border p-2.5 cursor-pointer w-[20%] min-w-62.5"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div
      ref="cardContentRef"
      class="box-border relative overflow-hidden flex flex-col items-start shadow-xl bg-[whitesmoke] rounded-[10px] w-full max-w-75 will-change-transform transition-transform duration-250 ease-out"
    >
      <div
        ref="glossRef"
        class="box-border absolute left-0 top-0 z-10 w-full h-full opacity-0 rounded-full will-change-opacity bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(255,255,255,0)_50%,rgba(255,255,255,0)_100%)]"
      ></div>
      <img
        class="box-border aspect-video w-full object-cover"
        :src="props.pic ? props.pic : NoPhoto"
        :alt="props.name"
      />
      <h2 class="box-border text-[20px] pt-2.5 pr-3.5 pb-1.25 pl-3.5 m-0">
        {{ props.name }}
      </h2>
      <p
        class="box-border text-[hsl(201,14%,40%)] text-[14px] pt-0 pr-3.5 pb-2.5 pl-3.5 m-0 text-left"
      >
        {{ props.description }}
      </p>
    </div>
  </div>
</template>
