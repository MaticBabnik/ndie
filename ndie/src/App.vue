<script setup lang="ts">
import ImageCanvas from '@/components/ImageCanvas.vue';
import ImageInfo from '@/components/ImageInfo.vue';
import { ref, computed, watch } from 'vue';

import {
    FilterType,
    COMPONENTS,
    DEFAULT_SETTINGS,
    FRIENDLY_NAME,
    type ExecutionStats,
    type IFilter,
} from '@/components/FilterComponents/filters';

import IcDrag from '@/components/icons/ic-drag.vue';
import IcDelete from '@/components/icons/ic-delete.vue';
import Draggable from 'vuedraggable';

const imageInfo = ref<typeof ImageInfo | null>(null);
const imageCanvas = ref<typeof ImageCanvas | null>(null);

const imgName = ref<string>(''),
    imgWidth = ref<number>(0),
    imgHeight = ref<number>(0);

const filters = ref<IFilter[]>([]);
const stats = ref<ExecutionStats[]>([]);

function addFilter(e: Event) {
    const name = (e.target as HTMLSelectElement).value;
    (e.target as HTMLSelectElement).value = 'add';
    if (!(name in DEFAULT_SETTINGS)) return;

    const id = filters.value.map((x) => x.id).reduce((p, c) => (p > c ? p : c), 0) + 1;

    filters.value.push({
        id,
        type: name as FilterType,
        params: DEFAULT_SETTINGS[name as FilterType] ?? {},
    });
}

function removeFilter(id: number) {
    filters.value.splice(
        filters.value.findIndex((x) => x.id == id),
        1,
    );
}

const noFilters = computed(() => filters.value.length == 0);

let blob: File | undefined;
let img = new Image();
let u: string | undefined;
let sourceImage: ImageData;
const noImage = ref(true);

async function newImage(e: DragEvent) {
    const potentialFile = e.dataTransfer?.files.item(0);
    if (!potentialFile) return;

    if (u) URL.revokeObjectURL(u);
    blob = potentialFile;
    u = URL.createObjectURL(blob);
    img.src = u;
    await img.decode();

    imgName.value = potentialFile.name ?? '<unknown>';
    imgWidth.value = img.width;
    imgHeight.value = img.height;

    let imgData: ImageData | undefined;
    {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx?.drawImage(img, 0, 0);
        imgData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        canvas.remove();
    }

    if (!imgData) return alert("Couldn't get image data");
    sourceImage = imgData;
    noImage.value = false;
    imageCanvas.value?.resize(img.width, img.height);
    imageCanvas.value?.putImageData(imgData);
    sourceOrGraphChange();
}

const worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
const workerBusy = ref(false);

watch(filters.value, () => {
    console.log('Updated');
    sourceOrGraphChange();
});

function sourceOrGraphChange() {
    if (!sourceImage) return;
    if (workerBusy.value) return;
    workerBusy.value = true;

    const ctx = imageInfo.value?.ctx as CanvasRenderingContext2D;
    const histogram = ctx.getImageData(0, 0, 256, 100);

    worker.postMessage({ graph: JSON.stringify(filters.value), image: sourceImage, histogram });
}

worker.onmessage = (ev) => {
    workerBusy.value = false;
    if (ev.data.error) return alert(ev.data.error);

    (imageInfo.value?.ctx as CanvasRenderingContext2D | null)?.putImageData(
        ev.data.histogram,
        0,
        0,
    );

    imageCanvas.value?.putImageData(ev.data.image);

    stats.value = ev.data.stats ?? [];
};

function save() {
    imageCanvas.value?.save();
}
</script>

<template>
    <nav>
        <h1>NDIE - Non Destructive Image Editor</h1>
        <h2 v-if="workerBusy">WORKING...</h2>
        <h2 v-if="noImage">Drop an image below to get started</h2>
        <div style="flex: 1"></div>
        <button @click="save">Save</button>
    </nav>
    <main @drop.prevent="newImage" @dragover.prevent>
        <div class="canvas-container">
            <image-canvas ref="imageCanvas" />
            <image-info
                ref="imageInfo"
                :width="imgWidth"
                :height="imgHeight"
                :name="imgName"
                :filter-times="stats"
            />
        </div>
        <div id="effect-stack">
            <select @change="addFilter" class="add-select">
                <option class="hidden" value="add" selected disabled>Add effect</option>
                <optgroup label="Basic">
                    <option value="grayscale">Grayscale</option>
                    <option value="invert">Invert</option>
                    <option value="threshold">Threshold</option>
                    <option value="hsv-adjust">HSV Adjust</option>
                    <option value="gamma">Gamma Correction</option>
                    <option value="linear-brightness">Linear Brightness</option>
                </optgroup>
                <optgroup label="Convolution">
                    <option value="box">Box blur</option>
                    <option value="gaussian">Gaussian blur</option>
                    <option value="sobel">Sobel</option>
                    <option value="laplace">Laplace</option>
                    <option value="unsharp-mask">Unsharp Masking</option>
                    <option value="kernel">Custom kernel</option>
                </optgroup>
                <optgroup label="Other">
                    <option value="pixelate">Pixelate</option>
                    <option value="noise">Noise</option>
                    <option value="bitcrush">Bitcrush</option>
                </optgroup>
            </select>

            <div class="list">
                <div class="no-effects" v-if="noFilters">
                    <h3>Infinite bacon, but no effects</h3>
                    Or infinite effects, but no effects
                </div>
                <draggable
                    :list="filters"
                    class="list-group"
                    ghost-class="ghost"
                    handle="h3"
                    item-key="id"
                >
                    <template #item="{ element }">
                        <div class="filter">
                            <h3>
                                <ic-drag /> {{ FRIENDLY_NAME[element.type as FilterType] }}
                                <button class="filter-rm" @click="removeFilter(element.id)">
                                    <ic-delete />
                                </button>
                            </h3>
                            <component
                                :is="COMPONENTS[element.type as FilterType]"
                                v-model:value="element.params"
                            ></component>
                        </div>
                    </template>
                </draggable>
            </div>
        </div>
    </main>
</template>

<style lang="less" scoped>
.no-effects {
    text-align: center;
    color: silver;
}
.add-select {
    width: 100%;
    padding: 5px;
    text-align: center;
    outline: none;
    background-color: #222;
    color: #fff;
    border-radius: 5px;
    border: 2px solid gray;
    margin-bottom: 5px;
    &:active {
        border: 2px solid #2b94c5;
    }

    .hidden {
        text-align: center;
        display: none;
    }
    optgroup {
        text-align: left;
        color: #2b94c5;
    }
    option {
        text-align: left;
        font-size: 16px;
        padding: 5px;
        color: #fff;
    }
}

nav {
    height: 48px;

    background-image: linear-gradient(to right, #2b91b9, #33469c, #912c9e, #9c336d);

    display: flex;
    flex-direction: row;
    align-items: center;

    h1 {
        margin: 0 10px;
        text-shadow: #0008 1px 1px 5px;
    }
    h2 {
        font-size: 16px;
        font-weight: 600;
        margin: 0 20px;
        text-shadow: #0008 1px 1px 5px;
    }

    button {
        margin: 0 10px;
        font-weight: bold;
        font-size: 18px;
        padding: 5px;
        text-align: center;
        outline: none;
        background-color: #222;
        color: #fff;
        border-radius: 5px;
        border: 2px solid gray;
        margin-bottom: 5px;
        &:active {
            border: 2px solid #2b94c5;
        }
    }
}

main {
    overflow: hidden;
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: stretch;
    align-items: stretch;
    width: 100vw;
    max-width: 100vw;
}

.canvas-container {
    overflow: hidden;
    width: 99%;
    height: 100%;
    min-width: 50%;
    display: block;
    resize: horizontal;
    background-color: #202020;
    border-right: 1px solid #888;
}

#effect-stack {
    overflow: auto;
    flex: 1;
    min-width: 300px;
    background-color: #333;
    padding: 5px;

    display: flex;
    flex-direction: column;
}

.filter-rm {
    background-color: transparent;
    border: none;
    outline: none;
    vertical-align: middle;
    display: inline;
    float: right;
    &:hover {
        svg {
            fill: rgb(255, 82, 82) !important;
        }
    }
    svg {
        fill: #f88 !important;
    }
}

.list {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 5px;
    .empty {
        display: none;
        &:only-child {
            display: block;
        }
    }
}

.filter {
    border: 2px solid silver;
    border-radius: 5px;
    background-color: #222;

    h3 {
        margin: 5px 0;
        cursor: grab;
        vertical-align: middle;
        svg {
            fill: #ccc;
            vertical-align: middle;
            display: inline;
        }
    }
    &:not(:last-of-type) {
        margin-bottom: 5px;
    }
}
</style>
