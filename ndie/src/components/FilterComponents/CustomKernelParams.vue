<script lang="ts" setup>
interface Argtype {
    size: number;
    numerator: number;
    denumerator: number;
    kernel: number[][];
}

const props = defineProps<{
    value: Argtype;
}>();

const emit = defineEmits<{
    (e: 'update:value', v: Argtype): void;
}>();

function updateKernel(y: number, x: number, v: number) {
    const kcpy = props.value.kernel.map((r) => r.map((v) => v - 0));
    kcpy[y][x] = v;

    emit('update:value', {
        numerator: props.value.numerator,
        denumerator: props.value.denumerator,
        size: props.value.size,
        kernel: kcpy,
    });
}

function newKernel(sz: number) {
    const newKern = [...Array(sz)].map(() => [...Array(sz)].map(() => 1));
    emit('update:value', {
        numerator: props.value.numerator,
        denumerator: sz * sz,
        size: sz,
        kernel: newKern,
    });
}

function updateNumerator(n: number) {
    if (n == 0) n = 1;

    emit('update:value', {
        numerator: n,
        denumerator: props.value.denumerator,
        size: props.value.size,
        kernel: props.value.kernel,
    });
}

function updateDenumerator(n: number) {
    if (n == 0) n = 1;
    emit('update:value', {
        numerator: props.value.numerator,
        denumerator: n,
        size: props.value.size,
        kernel: props.value.kernel,
    });
}
</script>

<template>
    <div class="filter-params ck-par">
        <div class="vgroup">
            <button v-for="i in 4" :key="i" @click="newKernel(i * 2 + 1)">
                New {{ i * 2 + 1 }}x{{ i * 2 + 1 }}
            </button>
        </div>
        <div class="vgroup">
            <table>
                <tr v-for="y in props.value.size" :key="y">
                    <td v-for="x in props.value.size" :key="x">
                        <input
                            type="number"
                            :value="props.value.kernel[y - 1][x - 1]"
                            @change="
                                updateKernel(
                                    y - 1,
                                    x - 1,
                                    ($event.target as HTMLInputElement).valueAsNumber,
                                )
                            "
                        />
                    </td>
                </tr>
            </table>
        </div>
        <div class="vgroup center-v">
            x
            <div class="fraction">
                <input
                    type="number"
                    :value="props.value.numerator"
                    @change="updateNumerator(($event.target as HTMLInputElement).valueAsNumber)"
                />
                <div class="line"></div>
                <input
                    type="number"
                    :value="props.value.denumerator"
                    @change="updateDenumerator(($event.target as HTMLInputElement).valueAsNumber)"
                />
            </div>
        </div>
    </div>
</template>
