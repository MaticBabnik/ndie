<script lang="ts" setup>
interface Argtype {
    size: number;
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
            Kernel size:
            <input
                type="range"
                :value="props.value.size"
                min="3"
                max="9"
                step="2"
                @change="
                    $emit('update:value', {
                        size: parseInt(($event.target as HTMLInputElement).value),
                    })
                "
            />
            <pre class="val">[{{ props.value.size }}x{{ props.value.size }}]</pre>
        </div>
    </div>
</template>
