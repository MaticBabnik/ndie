import type { LibFModule, ImageRef, KernelRef } from './libf';
import Module from './libf';

export enum LibFMode {
    WASM,
    WASM_SIMD,
    WASM_MT_SIMD,
}

type Selects<I, T> = {
    [K in keyof I]: I[K] extends T ? K : never;
}[keyof I];

type FilterFunctions<Args extends any[]> = Selects<
    LibFModule,
    (a: ImageRef, b: ImageRef, ...args: Args) => boolean
>;

type basic = FilterFunctions<[]>;

export interface ILibFImage {
    get width(): number;
    get height(): number;
    get valid(): boolean;

    readImageData(d: ImageData): void;
    writeImageData(d: ImageData): void;

    free(): void;
}

export interface ILibFKernel {
    get size(): number;

    get valid(): boolean;

    free(): void;
}

const STRUCT_SIZE = 16;

class FImage implements ILibFImage {
    protected ref: number;
    protected v = false;
    constructor(protected m: LibFModule, protected w: number, protected h: number) {
        this.ref = m._img_alloc(w, h);
        if (this.ref == 0) throw 'Allocation failed';
        this.v = true;
    }

    public get width() {
        return this.w;
    }

    public get height() {
        return this.h;
    }

    public get valid() {
        return this.v;
    }

    public get ptr() {
        return this.ref;
    }

    public readImageData(d: ImageData): void {
        if (!this.v) throw 'Underlying image was free()-d';

        if (d.width != this.w || d.height != this.h) throw "Image dimensions don't match";
        this.m.HEAPU8.set(d.data, this.ref + STRUCT_SIZE);
    }

    public writeImageData(d: ImageData): void {
        if (!this.v) throw 'Underlying image was free()-d';
        if (d.width != this.w || d.height != this.h) throw "Image dimensions don't match";

        d.data.set(
            this.m.HEAPU8.subarray(this.ref + STRUCT_SIZE, this.ref + STRUCT_SIZE + d.data.length),
        );
    }

    public free() {
        if (!this.v) throw 'Double free';
        this.v = false;
        this.m._f_free(this.ref);
    }
}

class FKernel implements ILibFKernel {
    protected ref: number;
    protected v = false;

    constructor(protected m: LibFModule, protected s: number) {
        this.ref = m._krn_alloc(s);
        if (this.ref == 0) throw 'Kernel allocation failed';
        this.v = true;
    }

    public get size() {
        return this.s;
    }

    public get valid() {
        return this.v;
    }

    public get ptr() {
        return this.ref;
    }

    public loadData(mul: number, data: number[][]) {
        if (!this.v) throw 'Underlying kernel was free()-d';
        const flatData = data.flat().map((x) => ~~x);
        if (data.length != this.s || flatData.length != this.s * this.s)
            throw 'Invalid kernel shape';

        // divisions by 4 are needed because we are adressing 32bits at once
        this.m.HEAPF32[this.ref / 4 + 1] = mul;
        this.m.HEAP32.set(flatData, this.ref / 4 + STRUCT_SIZE / 4);
    }

    public free() {
        if (!this.v) throw 'Double free';
        this.v = false;
        this.m._f_free(this.ref);
    }
}

export class LibF {
    private constructor(protected module: LibFModule, protected mode: LibFMode) {}

    public loadImage(d: ImageData): ILibFImage {
        const i = new FImage(this.module, d.width, d.height);
        i.readImageData(d);
        return i;
    }

    public createImage(w: number, h: number): ILibFImage {
        return new FImage(this.module, w, h);
    }

    public createKernel(s: number, mul: number, data: number[][]) {
        const k = new FKernel(this.module, s);
        k.loadData(mul, data);
        this.module._krn_dump(k.ptr);
        return k;
    }

    public imageGray(src: ILibFImage, dst: ILibFImage) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (!this.module._px_gray(srcPtr, dstPtr)) throw 'Operation failed';
    }

    public imageInvert(
        src: ILibFImage,
        dst: ILibFImage,
        mode: '_px_inv' | '_px_inv_simd' = '_px_inv',
    ) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (!this.module[mode](srcPtr, dstPtr)) throw 'Operation failed';
    }

    public gamma(src: ILibFImage, dst: ILibFImage, gamma: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (gamma <= 0) throw "Gamma can't be 0";

        if (!this.module._px_gamma(srcPtr, dstPtr, gamma)) throw 'Operation failed';
    }

    public linearBrightness(src: ILibFImage, dst: ILibFImage, mul: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (mul < 0) throw 'Mul must be positive';

        if (!this.module._px_lin_brightness(srcPtr, dstPtr, mul)) throw 'Operation failed';
    }

    public pixelate(src: ILibFImage, dst: ILibFImage, size: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (size < 2) throw 'Pixel size must be > 1';

        if (!this.module._px_pixelate(srcPtr, dstPtr, size)) throw 'Operation failed';
    }

    public noise(src: ILibFImage, dst: ILibFImage, noise: number, color: boolean) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (noise < 1 || noise > 255) throw 'Noise must be an U8';

        const seed = Math.floor(Math.random() * 2 ** 32);

        if (!this.module._px_noise(srcPtr, dstPtr, noise, color, seed)) throw 'Operation failed';
    }

    public bitcrush(src: ILibFImage, dst: ILibFImage, crush: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;
        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (crush < 1 || crush > 7) throw 'Crush must be between 1 and 7';

        if (!this.module._px_bitcrush(srcPtr, dstPtr, crush)) throw 'Operation failed';
    }

    public imageTreshold(src: ILibFImage, dst: ILibFImage, v: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (v < 0 || v > 255) throw 'v is out of range';
        if (!this.module._px_trsh(srcPtr, dstPtr, Math.round(v))) throw 'Operation failed';
    }

    public hsvAdjust(src: ILibFImage, dst: ILibFImage, h: number, s: number, v: number) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (h < -180 || h > 180) throw 'h is out of range';
        if (s < 0 || s > 10) throw 's is out of range';
        if (v < 0 || v > 10) throw 'v is out of range';

        if (!this.module._px_hsv_adjust(srcPtr, dstPtr, h, s, v)) throw 'Operation failed';
    }

    public imageApplyKernel(
        src: ILibFImage,
        dst: ILibFImage,
        krn: ILibFKernel,
        mode: '_krn_apply' | '_krn_apply_simd' = '_krn_apply',
    ) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;
        const krnPtr = (krn as FKernel).ptr;

        if (srcPtr == dstPtr) throw 'Applying kernels requires two different image objects';

        if (src.width != dst.width || src.height != dst.height)
            throw "Image dimensions don't match";

        if (!this.module[mode](srcPtr, dstPtr, krnPtr)) throw 'Operation failed';
    }

    public static async get(mode: LibFMode) {
        return new LibF(await Module(), mode);
    }

    public imageHistogram(src: ILibFImage, dst: ILibFImage) {
        const srcPtr = (src as FImage).ptr;
        const dstPtr = (dst as FImage).ptr;

        if (srcPtr == dstPtr) throw 'Applying kernels requires two different image objects';

        if (256 != dst.width || 100 != dst.height) throw 'Output image size wrong';

        if (!this.module._meta_histogram(srcPtr, dstPtr)) throw 'Operation failed';
    }
}
