<script lang="ts" setup>
interface Argtype {
    value: number;
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
            Value:
            <input
                type="range"
                :value="props.value.value"
                min="-100"
                max="100"
                step="1"
                @change="
                    $emit('update:value', {
                        value: parseInt(($event.target as HTMLInputElement).value),
                    })
                "
            />
            <pre class="val">[{{ props.value.value.toString().padStart(3, ' ') }}]</pre>
        </div>
    </div>
</template>
