#include "util.hh"
#include "libf.hh"
#include <cstdlib>
#include <cmath>

extern "C"
{
    Image *img_alloc(U16 w, U16 h)
    {
        /*
            allocate at least a full V128 more of memory to make sure
            that we don't corrupt anything when writing out with SIMD
        */
        U32 data_sz = align128(img_buffer_sz(w, h) + sizeof(Image));

        printf("[img_alloc] Allocating %ux%u (%uB)\n", w, h, data_sz);

        Image *r = (Image *)aligned_alloc(sizeof(Image), data_sz);

        if (r == nullptr)
            return nullptr;

        r->w = w;
        r->h = h;
        r->data.bytes = (U8 *)r + sizeof(Image);

        return r;
    }

    void f_free(void *p)
    {
        std::free(p);
        printf("[f_free] Freed 0x%x\n", (U32)p);
    }

    void px_dump(Image *src, U16 x, U16 y)
    {
        auto px_pos = (src->w * y + x) * 4;
        U8 *s = (U8 *)src + 4 + px_pos;
        printf("[px_dump] Color @ ( %u, %u ) = #%02X%02X%02X ( %u )\n", x, y, s[0], s[1], s[2], s[3]);
    }

#pragma region Pixel based filters

    bool px_inv(Image *src, Image *dst)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = 255 - s[i].r;
            d[i].g = 255 - s[i].g;
            d[i].b = 255 - s[i].b;
            d[i].a = /* */ s[i].a;
        }

        return true;
    }

    bool px_gray(Image *src, Image *dst)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = d[i].g = d[i].b = GS_RED * s[i].r + GS_GREEN * s[i].g + GS_BLUE * s[i].b;
            d[i].a = /* */ s[i].a;
        }
        return true;
    }

    bool px_trsh(Image *src, Image *dst, U8 v)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = s[i].r > v ? 255 : 0;
            d[i].g = s[i].g > v ? 255 : 0;
            d[i].b = s[i].b > v ? 255 : 0;
            d[i].a = s[i].a;
        }

        return true;
    }

    bool px_hsv_adjust(Image *src, Image *dst, F32 ha, F32 sa, F32 va)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        HSV chsv;
        RGB crgb;

        if (ha < 0)
            ha += 360;

        for (U32 i = 0; i < n_px; i++)
        {
            // convert to hsv
            crgb.r = s[i].r / 255.0f;
            crgb.g = s[i].g / 255.0f;
            crgb.b = s[i].b / 255.0f;
            chsv = rgb2hsv(crgb);

            chsv.h += ha;
            chsv.s *= sa;
            chsv.v *= va;

            chsv.h = fmod(chsv.h, 360.0f);

            // put it back
            crgb = hsv2rgb(chsv);
            d[i].r = clamp_u8(crgb.r * 255.0f);
            d[i].g = clamp_u8(crgb.g * 255.0f);
            d[i].b = clamp_u8(crgb.b * 255.0f);

            // alpha exists too
            d[i].a = s[i].a;
        }

        return true;
    }

    // made this up
    bool px_lin_brightness(Image *src, Image *dst, F32 mul)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = clamp_u8(mul * (F32)s[i].r);
            d[i].g = clamp_u8(mul * (F32)s[i].g);
            d[i].b = clamp_u8(mul * (F32)s[i].b);
            d[i].a = /* */ s[i].a;
        }

        return true;
    }

    // made this up too
    bool px_gamma(Image *src, Image *dst, F32 gamma)
    {
        if (!img_compare(src, dst))
            return false;

        F32 inverse_gamma = 1.0F / gamma;

        U8 lut[256];

        for (SZ i = 0; i < 256; i++)
        {
            lut[i] = clamp_u8(powf(i / 255.0, inverse_gamma) * 255.0F + 0.5F);
        }

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = lut[s[i].r];
            d[i].g = lut[s[i].g];
            d[i].b = lut[s[i].b];
            d[i].a = /* */ s[i].a;
        }

        return true;
    }

    bool px_pixelate(Image *src, Image *dst, U8 size)
    {
        if (!img_compare(src, dst))
            return false;

        Color *s = src->data.pixels;
        U32 *d = dst->data.rgba;

        for (SZ ly = 0; ly < src->h; ly += size)
        {
            for (SZ lx = 0; lx < src->w; lx += size)
            {
                U32 r = 0, g = 0, b = 0, a = 0;
                SZ ux = min<SZ>(lx + size, src->w), uy = min<SZ>(ly + size, src->h);
                U32 n_px = (ux - lx) * (uy - ly);

                for (SZ y = ly; y < uy; y++)
                    for (SZ x = lx; x < ux; x++)
                    {
                        r += s[x + src->w * y].r;
                        g += s[x + src->w * y].g;
                        b += s[x + src->w * y].b;
                        a += s[x + src->w * y].a;
                    }

                r /= n_px;
                g /= n_px;
                b /= n_px;
                a /= n_px;

                U32 px = (((U8)r) << 0) | (((U8)g) << 8) | (((U8)b) << 16) | (((U8)a) << 24);

                for (SZ y = ly; y < uy; y++)
                    for (SZ x = lx; x < ux; x++)
                        d[x + src->w * y] = px;
            }
        }
        return true;
    }

    // And you're lookin' for a way to crush, it's not enough
    bool px_bitcrush(Image *src, Image *dst, U8 crush)
    {
        if (!img_compare(src, dst))
            return false;

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;

        if (crush > 7)
            crush = 7;

        U8 comp = 1 << crush;
        U8 fill = ~(0xFF << crush);
        for (U32 i = 0; i < n_px; i++)
        {
            d[i].r = (s[i].r >> crush) << crush;
            if (d[i].r >= comp)
                d[i].r |= fill;
            d[i].g = (s[i].g >> crush) << crush;
            if (d[i].g >= comp)
                d[i].g |= fill;
            d[i].b = (s[i].b >> crush) << crush;
            if (d[i].b >= comp)
                d[i].b |= fill;

            d[i].a = s[i].a;
        }
        return true;
    }

    bool px_noise(Image *src, Image *dst, U8 noise, bool color, U32 seed)
    {
        if (!img_compare(src, dst))
            return false;

        srand(seed);

        SZ n_px = src->w * src->h;
        Color *s = src->data.pixels;
        Color *d = dst->data.pixels;
        I32 offset = noise / 2;
        if (color)
            for (U32 i = 0; i < n_px; i++)
            {
                d[i].r = clamp_u8(s[i].r + (rand() % noise) - offset);
                d[i].g = clamp_u8(s[i].g + (rand() % noise) - offset);
                d[i].b = clamp_u8(s[i].b + (rand() % noise) - offset);
                d[i].a = s[i].a;
            }
        else
            for (U32 i = 0; i < n_px; i++)
            {
                I32 n = (rand() % noise) - offset;
                d[i].r = clamp_u8(s[i].r + n);
                d[i].g = clamp_u8(s[i].g + n);
                d[i].b = clamp_u8(s[i].b + n);
                d[i].a = s[i].a;
            }

        return true;
    }

#pragma endregion Pixel based filters

#pragma region Kernels
    Kernel *krn_alloc(U8 s)
    {
        if (s % 2 == 0)
            return nullptr;

        U32 data_sz = align128(sizeof(I32) * s * s);
        U32 total = sizeof(Kernel) + data_sz;
        printf("[krn_alloc] Allocating kernel (%u x %u) [%u B (%u B aligned)]\n", s, s, data_sz, total);
        Kernel *r = (Kernel *)aligned_alloc(16, sizeof(Kernel) + data_sz);

        if (r == nullptr)
            return nullptr;

        r->s = s;
        r->mul = 1.0f;
        U8 *bp = (U8 *)(void *)r;
        r->data = (I32 *)(bp + sizeof(Kernel));
        return r;
    }

    void krn_dump(Kernel *krn)
    {
        printf("Kernel (%u) @ 0x%x\n multiplier: %.3f\n\n", krn->s, (U32)krn, krn->mul);
        I32 *m = krn->data;
        for (U32 my = 0; my < krn->s; my++)
        {
            for (U32 mx = 0; mx < krn->s; mx++)
            {
                printf("%d, ", m[mx + my * krn->s]);
            }
            puts("\n");
        }
    }

    bool krn_apply(Image *src, Image *dst, Kernel *krn)
    {
        if (!img_compare(src, dst))
            return false;

        // size helpers
        U32 sz = img_buffer_sz(src->w, src->h),
            krn_mid = krn->s / 2,
            row = src->w;

        // image buffers
        U8 *s = src->data.bytes;
        U8 *d = dst->data.bytes;

        // kernel buffer
        I32 *k = (I32 *)krn->data;

        // variables
        I32 sum = 0;
        U32 rel_kr_x, rel_kr_y, neighbor_offset;

        for (U32 offset = 0; offset < sz; offset += 4) // per pixel
        {
            for (U32 c = 0; c < 3; c++) // per channel
            {
                sum = 0;
                for (U32 mx = 0; mx < krn->s; mx++)
                    for (U32 my = 0; my < krn->s; my++)
                    {
                        rel_kr_x = mx - krn_mid;
                        rel_kr_y = my - krn_mid;
                        neighbor_offset = (offset + (rel_kr_y * row + rel_kr_x) * 4);
                        sum += k[mx + my * krn->s] * s[neighbor_offset + c];
                    }

                d[offset + c] = clamp_u8(krn->mul * (F32)sum);
            }
            d[offset + 3] = s[offset + 3]; // copy alpha
        }

        return true;
    }

#pragma endregion Kernels

#pragma region Other

    bool meta_histogram(Image *src, Image *dst)
    {
        if (dst->w != 128 && dst->h != 100)
            return false;

        U32 r_vals[256];
        U32 g_vals[256];
        U32 b_vals[256];

        for (SZ i = 0; i < 256; i++)
        {
            r_vals[i] = 0;
            g_vals[i] = 0;
            b_vals[i] = 0;
        }

        Color *px = src->data.pixels;
        SZ n_pix = src->w * src->h;

        for (SZ i = 0; i < n_pix; i++)
        {
            r_vals[px->r]++;
            g_vals[px->g]++;
            b_vals[px->b]++;
            px++;
        }

        U32 max = 0;
        for (SZ i = 0; i < 256; i++)
        {
            if (r_vals[i] > max)
                max = r_vals[i];
            if (g_vals[i] > max)
                max = g_vals[i];
            if (b_vals[i] > max)
                max = b_vals[i];
        }

        if (max < 25600)
        {
            max *= 100;
            for (SZ i = 0; i < 256; i++)
            {
                r_vals[i] *= 100;
                g_vals[i] *= 100;
                b_vals[i] *= 100;
            }
        }

        U32 div = max / 25600;
        if (div < 10)
            div += 1;
        printf("div: %d / 100 = %d\n", max, div);

        Color *out = dst->data.pixels;
        for (SZ x = 0; x < 256; x++)
        {
            I32 rv = r_vals[x] / div;
            I32 gv = g_vals[x] / div;
            I32 bv = b_vals[x] / div;

            for (SZ y = 0; y < 100; y++)
            {
                out[x + (99 - y) * 256].r = clamp_u8(rv);
                out[x + (99 - y) * 256].g = clamp_u8(gv);
                out[x + (99 - y) * 256].b = clamp_u8(bv);
                out[x + (99 - y) * 256].a = 255;

                rv -= 256;
                gv -= 256;
                bv -= 256;
            }
        }

        return true;
    }
#pragma endregion Other
}