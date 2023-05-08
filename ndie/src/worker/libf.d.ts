export default async function Module(): Promise<LibFModule>;

export type ImageRef = number;
export type KernelRef = number;

export interface LibFModule {
    HEAPU8: Uint8Array;
    HEAP32: Int32Array;
    HEAPF32: Float32Array;

    _img_alloc(w: number, h: number): ImageRef;
    _krn_alloc(s: number): KernelRef;
    _f_free(o: KernelRef | ImageRef): void;

    _px_dump(i: ImageRef, x: number, y: number): void;
    _krn_dump(k: KernelRef): void;

    _px_inv(a: ImageRef, b: ImageRef): boolean;
    _px_inv_simd(a: ImageRef, b: ImageRef): boolean;
    _px_gray(a: ImageRef, b: ImageRef): boolean;
    _px_trsh(a: ImageRef, b: ImageRef, v: number): boolean;
    _px_hsv_adjust(a: ImageRef, b: ImageRef, h: number, s: number, v: number): boolean;
    _px_lin_brightness(a: ImageRef, b: ImageRef, mul: number): boolean;
    _px_gamma(a: ImageRef, b: ImageRef, gamma: number): boolean;
    _px_pixelate(a: ImageRef, b: ImageRef, size: number): boolean;
    _px_bitcrush(a: ImageRef, b: ImageRef, crush: number): boolean;
    _px_noise(a: ImageRef, b: ImageRef, noise: number, color: boolean, seed: number): boolean;

    _krn_apply(a: ImageRef, b: ImageRef, m: KernelRef): boolean;
    _krn_apply_simd(a: ImageRef, b: ImageRef, m: KernelRef): boolean;

    _meta_histogram(a: ImageRef, b: ImageRef): boolean;
}
