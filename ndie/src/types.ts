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

export interface ExecutionStats {
    filter: string;
    time: number;
}

export interface IFilter {
    id: number;
    type: FilterType;
    params: Object;
}
