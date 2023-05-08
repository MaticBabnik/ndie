#include "libf.hh"

#define SIMD_ZERO wasm_i32x4_const_splat(0)
#define SIMD_4xFF wasm_i32x4_const_splat(255)

const U8 SWIZZLE_TO_32BIT[] = {
    0, 4, 8, 12,
    16, 16, 16, 16,
    16, 16, 16, 16,
    16, 16, 16, 16};

#define SIMD_RGB_PACK wasm_v128_load(SWIZZLE_TO_32BIT)

template <typename T>
inline T *alloc_aligned(SZ align, SZ size)
{
    return (T *)aligned_alloc(align, align128(size));
}

extern "C"
{
#pragma region Pixel based filters

    bool px_inv_simd(Image *src, Image *dst)
    {
        if (!img_compare(src, dst))
            return false;

        U32 sz = img_buffer_sz(src->w, src->h);
        U8 *s = src->data.bytes;
        U8 *d = dst->data.bytes;

        V128 inv = wasm_u8x16_const_splat(255);
        V128 data;

        for (SZ i = 0; i <= sz; i += 16)
        {
            data = wasm_v128_load(&s[i]);

            wasm_v128_store(
                &d[i],
                wasm_i8x16_shuffle(
                    wasm_u8x16_sub_sat(inv, data),
                    data,
                    0, 1, 2, 19,
                    4, 5, 6, 23,
                    8, 9, 10, 27,
                    12, 13, 14, 31));
        }

        return true;
    }
#pragma endregion Pixel based filters

#pragma region Kernels

    bool krn_apply_simd(Image *src, Image *dst, Kernel *kernel)
    {
        if (!img_compare(src, dst))
            return false;

        // optimize kernel data layout for SIMD operations
        I32 *k = kernel->data;
        SZ krn_data_sz = kernel->s * kernel->s;
        I32 *simd_kernel = alloc_aligned<I32>(sizeof(V128), 4 * krn_data_sz); // alloc never fails
        for (I32 data_i = 0, simd_i = 0; data_i < krn_data_sz; data_i++, simd_i += 4)
        {
            simd_kernel[simd_i + 0] = k[data_i];
            simd_kernel[simd_i + 1] = k[data_i];
            simd_kernel[simd_i + 2] = k[data_i];
            simd_kernel[simd_i + 3] = 1; // kernels ignore alpha
        }

        // grab the source and destination data pointers
        U32 *s = src->data.rgba;
        U32 *d = dst->data.rgba;

        // x and y coords for loading image pixels
        I32 imx, imy;

        // the offset that changes the absolute kernel coords, into relative image coords
        I32 kernel_offset = -(kernel->s / 2);

        for (SZ y = 0; y < src->h; y++)
        {
            for (SZ x = 0; x < src->w; x++)
            {
                V128 sum = SIMD_ZERO;

                for (I32 ky = 0; ky < kernel->s; ky++)
                {
                    // calculate Y coord
                    imy = clamp(0, y + ky + kernel_offset, src->h - 1);

                    for (I32 kx = 0; kx < kernel->s; kx++)
                    {
                        // calculate X coord
                        imx = clamp(0, x + kx + kernel_offset, src->w - 1);
                        // load kernel
                        V128 krn_px = wasm_v128_load(&simd_kernel[(kx + ky * kernel->s) * 4]);
                        // load image
                        V128 px = wasm_u32x4_extend_low_u16x8(wasm_u16x8_load8x8(&s[imx + imy * src->w]));
                        // store result
                        sum = wasm_i32x4_add(sum, wasm_i32x4_mul(krn_px, px));
                    }
                }

                if (kernel->mul != 1.0f)
                {
                    // multiply by kernel's multiplier
                    V128 mul = wasm_f32x4_splat(kernel->mul);
                    sum = wasm_i32x4_trunc_sat_f32x4(wasm_f32x4_mul(wasm_f32x4_convert_i32x4(sum), mul));
                }

                // clamp and shrink values to U8
                sum = wasm_i32x4_max(SIMD_ZERO, wasm_i32x4_min(sum, SIMD_4xFF));
                sum = wasm_i8x16_swizzle(sum, SIMD_RGB_PACK);

                // load alpha
                sum = wasm_v128_load8_lane(((U8 *)(void *)&s[(imx + imy * src->w)]) + 3, sum, 3);

                // write back into buffer
                // this operation also overrides the next 3 pixels, but we do not care
                wasm_v128_store(&d[x + y * src->w], sum);
            }
        }

        free(simd_kernel);
        return true;
    }

#pragma endregion Kernels
}