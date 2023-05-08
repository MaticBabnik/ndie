<script lang="ts" setup>
interface Argtype {
    bits: number;
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
            Bits:
            <input
                type="range"
                :value="props.value.bits"
                min="1"
                max="7"
                step="1"
                @change="
                    $emit('update:value', {
                        bits: parseInt(($event.target as HTMLInputElement).value),
                    })
                "
            />
            <pre class="val">[{{ props.value.bits.toString().padStart(2, ' ') }}]</pre>
        </div>
    </div>
</template>
