<script setup lang="ts">
import { ref, type Ref, onMounted, onUnmounted, computed } from 'vue';

import { type ExecutionStats } from '@/types';
const props = defineProps<{
    name: string;
    width: number;
    height: number;
    filterTimes: ExecutionStats[];
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);

onMounted(() => {
    ctx.value = canvas.value?.getContext('2d', { willReadFrequently: true }) ?? null;
});
onUnmounted(() => {
    ctx.value = null;
});

defineExpose<{
    ctx: Ref<CanvasRenderingContext2D | null>;
}>({
    ctx,
});

const sum = computed(() => {
    return props.filterTimes.map((x) => x.time).reduce((c, p) => c + p, 0);
});

function color(time: number) {
    const other = 255 - Math.min((time / sum.value) * 255, 255);

    return `color: rgb(255,${other},${other})`;
}
</script>

<template>
    <div class="image-info">
        <h3>Image Info</h3>
        <span><b>Name:</b> {{ props.name }}</span>
        <span><b>Width:</b> {{ props.width }}</span>
        <span><b>Height:</b> {{ props.height }}</span>
        <h3>Performance</h3>
        <span v-for="(t, i) in props.filterTimes" :key="i" class="perf" :style="color(t.time)"
            ><b>{{ t.filter }}:</b><span class="time"> {{ t.time }} ms</span></span
        >
        <span class="perf"> <b>-----------</b><span class="time">----------</span> </span>
        <span class="perf">
            <b>Total:</b><span class="time"> {{ sum }} ms</span>
        </span>
        <h3>Histogram</h3>
        <canvas width="256" height="100" ref="canvas"> </canvas>
    </div>
</template>

<style scoped lang="less">
.image-info {
    padding: 10px;
    position: absolute;

    top: 10px;
    left: 10px;
    display: flex;
    flex-direction: column;
    background-color: #0005;

    h3 {
        margin-top: 5px;
        padding-left: 0;
        margin: 0;
        color: #36b1eb;
    }

    span {
        padding-left: 3px;
    }
    .perf {
        font-family: monospace;
        .time {
            float: right;
        }
    }
}
</style>
