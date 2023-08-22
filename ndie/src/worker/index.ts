/// <reference lib="ES2015" />
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import { LibF, LibFMode } from './libfilter';
import { FilterType, type IFilter, type ExecutionStats } from '@/types';

type GausianSize = 3 | 5 | 7;
interface JSKernel {
    mul: number;
    kernel: number[][];
}

const GAUSSIAN_BLUR: Record<GausianSize, JSKernel> = {
    3: {
        mul: 1 / 16,
        kernel: [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1],
        ],
    },
    5: {
        mul: 1 / 273,
        kernel: [
            [1, 4, 7, 4, 1],
            [4, 16, 26, 16, 4],
            [7, 26, 41, 26, 7],
            [4, 16, 26, 16, 4],
            [1, 4, 7, 4, 1],
        ],
    },
    7: {
        mul: 1 / 1003,
        kernel: [
            [0, 0, 1, 2, 1, 0, 0],
            [0, 3, 13, 22, 13, 3, 0],
            [1, 13, 59, 97, 59, 13, 1],
            [2, 22, 97, 159, 97, 22, 2],
            [1, 13, 59, 97, 59, 13, 1],
            [0, 3, 13, 22, 13, 3, 0],
            [0, 0, 1, 2, 1, 0, 0],
        ],
    },
};

const SOBEL = {
    x: [
        [1, 0, -1],
        [2, 0, -2],
        [1, 0, -1],
    ],
    y: [
        [1, 2, 1],
        [0, 0, 0],
        [-1, -2, -1],
    ],
};

const LAPLACE = [
    [-1, -1, -1],
    [-1, 8, -1],
    [-1, -1, -1],
];

const UNSHARP_MASK = [
    [-1, -1, -1],
    [-1, 9, -1],
    [-1, -1, -1],
];

function createBoxBlur(libf: LibF, size: number) {
    const data = [...Array(size)].map(() => [...Array(size)].map(() => 1));
    return libf.createKernel(size, 1 / (size * size), data);
}

function getGaussianKernel(libf: LibF, size: number) {
    const kd = GAUSSIAN_BLUR[size as GausianSize] ?? GAUSSIAN_BLUR[3];

    return libf.createKernel(kd.kernel.length, kd.mul, kd.kernel);
}

interface ValueArgs {
    value: number;
}

interface SizeArgs {
    size: number;
}

interface DirectionArgs {
    direction: 'x' | 'y';
}

interface NoiseArgs {
    color: boolean;
    noise: number;
}

interface PixelateArgs {
    pixelSize: number;
}

interface BitcrushArgs {
    bits: number;
}

interface HSVArgs {
    hue: number;
    saturation: number;
    value: number;
}

interface CustomKernelArgs {
    size: number;
    numerator: number;
    denumerator: number;
    kernel: number[][];
}

function cm(x: number) {
    return Math.pow(10, x / 100);
}

LibF.get(LibFMode.WASM_SIMD).then((libf) => {
    self.addEventListener('message', (ev: ExtendableMessageEvent) => {
        const { data } = ev;

        if (typeof data.graph !== 'string') return postMessage({ error: 'No graph' });
        if (!(data.image instanceof ImageData)) return postMessage({ error: 'No image' });
        if (!(data.histogram instanceof ImageData)) return postMessage({ error: 'Histogram' });

        const stats: ExecutionStats[] = [];

        const graph = JSON.parse(data.graph) as IFilter[];
        const image = data.image as ImageData;
        const histogram = data.histogram as ImageData;

        const a = libf.createImage(image.width, image.height);
        const b = libf.createImage(image.width, image.height);

        let cur = a,
            next = b;

        const hs = libf.createImage(histogram.width, histogram.height);

        a.readImageData(image);

        function swapSrcDest() {
            const bk = cur;
            cur = next;
            next = bk;
        }

        for (const filter of graph) {
            const st = self.performance.now();
            switch (filter.type) {
                case FilterType.Invert:
                    libf.imageInvert(cur, cur, '_px_inv_simd');
                    break;

                case FilterType.Grayscale:
                    libf.imageGray(cur, cur);
                    break;

                case FilterType.Threshold:
                    libf.imageTreshold(cur, cur, (filter.params as ValueArgs).value);
                    break;

                case FilterType.HsvAdjust: {
                    const args = filter.params as HSVArgs;
                    libf.hsvAdjust(cur, cur, args.hue, args.saturation, args.value);
                    break;
                }
                case FilterType.GammaCorrection:
                    libf.gamma(cur, cur, (filter.params as ValueArgs).value);
                    break;

                case FilterType.LinearBrightness:
                    libf.linearBrightness(cur, cur, cm((filter.params as ValueArgs).value));
                    break;

                case FilterType.Box: {
                    const kernel = createBoxBlur(libf, (filter.params as SizeArgs).size);
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }

                case FilterType.Gaussian: {
                    const kernel = getGaussianKernel(libf, (filter.params as SizeArgs).size);
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }

                case FilterType.Sobel: {
                    const kernel = libf.createKernel(
                        3,
                        1,
                        SOBEL[(filter.params as DirectionArgs).direction],
                    );
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }

                case FilterType.Laplace: {
                    const kernel = libf.createKernel(3, 1, LAPLACE);
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }

                case FilterType.UnsharpMask: {
                    const kernel = libf.createKernel(
                        3,
                        (filter.params as ValueArgs).value,
                        UNSHARP_MASK,
                    );
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }

                case FilterType.Kernel: {
                    const kArgs = filter.params as CustomKernelArgs;
                    const kernel = libf.createKernel(
                        kArgs.size,
                        kArgs.numerator / kArgs.denumerator,
                        kArgs.kernel,
                    );
                    libf.imageApplyKernel(cur, next, kernel);

                    kernel.free();
                    swapSrcDest();
                    break;
                }
                case FilterType.Noise: {
                    const na = filter.params as NoiseArgs;
                    libf.noise(cur, cur, na.noise, na.color);
                    break;
                }
                case FilterType.Pixelate:
                    libf.pixelate(cur, cur, (filter.params as PixelateArgs).pixelSize);
                    break;
                case FilterType.Bitcrush:
                    libf.bitcrush(cur, cur, (filter.params as BitcrushArgs).bits);
                    break;

                default:
                    console.log(`Filter: ${filter.type} not implemented`);
                    break;
            }

            stats.push({
                filter: filter.type,
                time: ~~(self.performance.now() - st),
            });
        }

        libf.imageHistogram(cur, hs);
        hs.writeImageData(histogram);
        cur.writeImageData(image);

        a.free();
        b.free();
        hs.free();

        postMessage({ image, histogram, stats });
    });
});

export default null;
