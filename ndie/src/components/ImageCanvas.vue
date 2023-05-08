<script setup lang="ts">
import { useMousePressed } from '@vueuse/core';
import { onMounted, ref } from 'vue';

const MAX_SCALE = 10; // 1000%
const MIN_SCALE = 0.1; // 5%

const scale = ref(1);
const cRef = ref<HTMLDivElement | null>(null);
const imgRef = ref<HTMLImageElement | null>(null);
const canvasRef = ref<HTMLDivElement | null>(null);

const internalCanvas = document.createElement('canvas');
const ctx = internalCanvas.getContext('2d', { willReadFrequently: true });
if (!ctx) alert('Image CTX failed');

const url = ref('');

function resize(w: number, h: number) {
    internalCanvas.width = w;
    internalCanvas.height = h;
}

function putImageData(d: ImageData) {
    ctx?.putImageData(d, 0, 0);
    url.value = internalCanvas.toDataURL();
}

function zoom(e: WheelEvent) {
    if (!cRef.value || !canvasRef.value || !imgRef.value) return;
    // const prevScale = scale.value
    scale.value += e.deltaY * -0.001;
    scale.value = Math.max(MIN_SCALE, Math.min(scale.value, MAX_SCALE));

    const sImgW = Math.max(1, scale.value) * imgRef.value.width;
    const sImgH = Math.max(1, scale.value) * imgRef.value.height;
    canvasRef.value.style.width = sImgW + 'px';
    canvasRef.value.style.height = sImgH + 'px';

    // requestAnimationFrame(() => {
    //     if (!cRef.value || !canvasRef.value || !imgRef.value) return
    //     const containerRect = cRef.value.getBoundingClientRect()
    //     const dx = (containerRect.width / 2) * (1 / prevScale - 1 / scale.value)
    //     const dy = (containerRect.height / 2) * (1 / prevScale - 1 / scale.value)
    //     cRef.value.scrollBy({ left: dx, top: dy })
    // })
}

const a = useMousePressed({
    touch: true,
    drag: true,
});

function move(e: MouseEvent) {
    if (!a.pressed.value || !cRef.value) return;

    cRef.value.scrollBy({ left: -1 * e.movementX, top: -1 * e.movementY });
}

function save() {
    if (url.value == '') return;

    var a = document.createElement('a');
    a.href = url.value;
    a.download = `ndie.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

defineExpose<{
    resize: (w: number, h: number) => void;
    putImageData: (d: ImageData) => void;
    save: () => void;
}>({
    resize,
    putImageData,
    save,
});

onMounted(() => {});
</script>

<template>
    <div class="container" @wheel.prevent="zoom" @mousemove="move" ref="cRef">
        <div class="canvas" ref="canvasRef">
            <img
                :src="url"
                :class="{ pixelated: scale >= 4 }"
                :style="`transform: scale(${scale})`"
                ref="imgRef"
            />
        </div>
    </div>
</template>

<style lang="less">
.container {
    position: relative;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;

    overflow: scroll !important;

    .canvas {
        display: grid;
        place-items: center;
        width: fit-content;

        img {
            pointer-events: none;
            &.pixelated {
                image-rendering: pixelated;
            }
        }
    }
}
</style>
