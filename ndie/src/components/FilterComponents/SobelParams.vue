<script lang="ts" setup>
interface Argtype {
    direction: 'x' | 'y';
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
            Direction:

            <select
                :value="props.value.direction"
                @change="
                    $emit('update:value', {
                        direction: ($event.target as HTMLSelectElement).value,
                    })
                "
            >
                <option value="x">X</option>
                <option value="y">Y</option>
            </select>
        </div>
    </div>
</template>
