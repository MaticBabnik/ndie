<script lang="ts" setup>
import { ref } from 'vue';
interface Argtype {
    noise: number;
    color: boolean;
}

const props = defineProps<{
    value: Argtype;
}>();

const e = defineEmits<{
    (e: 'update:value', v: Argtype): void;
}>();

const cc = ref<HTMLInputElement | null>(null);
const sn = ref<HTMLInputElement | null>(null);

function update() {
    if (!cc.value || !sn.value) return;

    e('update:value', { color: cc.value.checked, noise: sn.value.valueAsNumber });
}
</script>

<template>
    <div class="filter-params">
        <div class="vgroup">
            <label>
                <input ref="cc" type="checkbox" @change="update" :value="props.value.color" />
                Color
            </label>
        </div>

        <div class="vgroup">
            Noise:
            <input
                ref="sn"
                type="range"
                :value="props.value.noise"
                min="1"
                max="255"
                step="1"
                @change="update"
            />
            <pre class="val">[{{ props.value.noise.toString().padStart(3, ' ') }}]</pre>
        </div>
    </div>
</template>
