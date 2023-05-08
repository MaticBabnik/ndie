<script lang="ts" setup>
interface Argtype {
    pixelSize: number;
}

const props = defineProps<{
    value: Argtype;
}>();

defineEmits<{
    (e: 'update:value', v: Argtype): void;
}>();
</script>

<template>
    <div class="filter-params">
        <div class="vgroup">
            Pixel size:
            <input
                type="range"
                :value="props.value.pixelSize"
                min="2"
                max="24"
                step="2"
                @change="
                    $emit('update:value', {
                        pixelSize: parseInt(($event.target as HTMLInputElement).value),
                    })
                "
            />
            <pre class="val">[{{ props.value.pixelSize.toString().padStart(2, ' ') }}]</pre>
        </div>
    </div>
</template>
