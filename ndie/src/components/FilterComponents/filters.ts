import type { Component } from 'vue';

import NoParams from './NoParams.vue';
import ThresholdParams from './ThresholdParams.vue';
import PredefKernelParams from './PredefKernelParams.vue';
import HSVParams from './HSVParams.vue';
import ContrastParams from './ContrastParams.vue';
import SobelParams from './SobelParams.vue';
import SharpenParams from './SharpenParams.vue';
import GammaParams from './GammaParams.vue';
import PixelateParams from './PixelateParams.vue';
import BitcrushParams from './BitcrushParams.vue';
import NoiseParams from './NoiseParams.vue';
import CustomKernelParams from './CustomKernelParams.vue';

export enum FilterType {
    Grayscale = 'grayscale',
    Invert = 'invert',
    Threshold = 'threshold',
    HsvAdjust = 'hsv-adjust',
    LinearBrightness = 'linear-brightness',
    GammaCorrection = 'gamma',
    Box = 'box',
    Gaussian = 'gaussian',
    Sobel = 'sobel',
    Laplace = 'laplace',
    UnsharpMask = 'unsharp-mask',
    Kernel = 'kernel',
    Pixelate = 'pixelate',
    Noise = 'noise',
    Bitcrush = 'bitcrush',
}

export const FRIENDLY_NAME: Record<FilterType, string> = {
    [FilterType.Grayscale]: 'Grayscale',
    [FilterType.Invert]: 'Invert',
    [FilterType.Threshold]: 'Threshold',
    [FilterType.LinearBrightness]: 'Linear brightness',
    [FilterType.GammaCorrection]: 'Gamma correction',
    [FilterType.HsvAdjust]: 'HSV Adjust',
    [FilterType.Box]: 'Box Blur',
    [FilterType.Gaussian]: 'Gaussian Blur',
    [FilterType.Sobel]: 'Sobel',
    [FilterType.Laplace]: 'Laplace',
    [FilterType.UnsharpMask]: 'Unsharp Masking',
    [FilterType.Kernel]: 'Custom Kernel',
    [FilterType.Pixelate]: 'Pixelate',
    [FilterType.Noise]: 'Noise',
    [FilterType.Bitcrush]: 'Bitcrush',
};

export const DEFAULT_SETTINGS: Record<FilterType, Object> = {
    [FilterType.Grayscale]: {},
    [FilterType.Invert]: {},
    [FilterType.Threshold]: {
        value: 127,
    },
    [FilterType.LinearBrightness]: {
        value: 0,
    },
    [FilterType.GammaCorrection]: {
        value: 1,
    },
    [FilterType.HsvAdjust]: {
        hue: 0,
        saturation: 1,
        value: 1,
    },
    [FilterType.Box]: {
        size: 3,
    },
    [FilterType.Gaussian]: {
        size: 3,
    },
    [FilterType.Sobel]: {
        direction: 'x',
    },
    [FilterType.Laplace]: {},
    [FilterType.UnsharpMask]: {
        value: 1,
    },
    [FilterType.Kernel]: {
        size: 3,
        numerator: 1,
        denumerator: 1,
        kernel: [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
        ],
    },
    [FilterType.Pixelate]: {
        pixelSize: 10,
    },
    [FilterType.Noise]: {
        color: false,
        noise: 10,
    },
    [FilterType.Bitcrush]: {
        bits: 4,
    },
};

export const COMPONENTS: Record<FilterType, Component> = {
    [FilterType.Grayscale]: NoParams,
    [FilterType.Invert]: NoParams,
    [FilterType.Threshold]: ThresholdParams,
    [FilterType.LinearBrightness]: ContrastParams,
    [FilterType.GammaCorrection]: GammaParams,
    [FilterType.HsvAdjust]: HSVParams,
    [FilterType.Box]: PredefKernelParams,
    [FilterType.Gaussian]: PredefKernelParams,
    [FilterType.Sobel]: SobelParams,
    [FilterType.Laplace]: NoParams,
    [FilterType.UnsharpMask]: SharpenParams,
    [FilterType.Kernel]: CustomKernelParams,
    [FilterType.Pixelate]: PixelateParams,
    [FilterType.Noise]: NoiseParams,
    [FilterType.Bitcrush]: BitcrushParams,
};

export interface ExecutionStats {
    filter: string;
    time: number;
}

export interface IFilter {
    id: number;
    type: FilterType;
    params: Object;
}
