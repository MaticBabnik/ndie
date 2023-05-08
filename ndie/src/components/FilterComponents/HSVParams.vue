<script lang="ts" setup>
import { ref } from 'vue';
interface Argtype {
    hue: number;
    saturation: number;
    value: number;
}

const props = defineProps<{
    value: Argtype;
}>();

const e = defineEmits<{
    (e: 'update:value', v: Argtype): void;
}>();

const sh = ref<HTMLInputElement | null>(null);
const ss = ref<HTMLInputElement | null>(null);
const sv = ref<HTMLInputElement | null>(null);

function update() {
    if (!sh.value || !ss.value || !sv.value) return true;

    e('update:value', {
        hue: sh.value.valueAsNumber,
        saturation: ss.value.valueAsNumber,
        value: sv.value.valueAsNumber,
    });
}
</script>

<template>
    <div class="filter-params">
        <div class="vgroup">
            H:
            <input
                ref="sh"
                type="range"
                :value="props.value.hue"
                min="-180"
                max="180"
                step="1"
                @change="update"
            />
            <pre class="val">[{{ props.value.hue.toString().padStart(4, ' ') }}]</pre>
        </div>
        <div class="vgroup">
            S:
            <input
                ref="ss"
                type="range"
                :value="props.value.saturation"
                min="0"
                max="2"
                step=".01"
                @change="update"
            />
            <pre class="val">[{{ props.value.saturation.toString().padStart(4, ' ') }}]</pre>
        </div>
        <div class="vgroup">
            V:
            <input
                ref="sv"
                type="range"
                :value="props.value.value"
                min="0"
                max="2"
                step=".01"
                @change="update"
            />
            <pre class="val">[{{ props.value.value.toString().padStart(4, ' ') }}]</pre>
        </div>
    </div>
</template>
