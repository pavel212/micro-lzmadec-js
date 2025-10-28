function lzmadec(src){
  let view = new DataView(src.buffer), 
      u32 = (i,e)=>view.getUint32(i,e),
      src_pos = 18,
      a = src[0], 
      pb = Math.floor(a / 45), 
      lc = a % 9, 
      lp = Math.floor(a / 9) % 5, 
      dict_size = Math.max(u32(1,!0), 0x1000), 
      max_size = u32(5,!0), 
      num_probs = 1846 + (768 << (lc + lp)),
      probs = new Uint16Array(num_probs).fill(1024), p = [],
      dst = new Uint8Array(max_size), dst_pos = 0,
      value=0, state=0, bit0, len, i, n, k, rep0 = 1, rep1 = 1, rep2 = 1, rep3 = 1, offset,
      code = u32(14,!1), range=0xFFFFFFFF, t0, t1, t2,
      RC_NORMALIZE = () => {if (range < 0x1000000) {range = (range<<8)>>>0; code = (code << 8 | src[src_pos++])>>>0}},
      RC_BIT = x => {
        RC_NORMALIZE(); 
        t2 = t0 = probs[p[x]]; 
        t1 = (t0 * (range >>> 11))>>>0; 
        bit0 = code < t1; 
        if (bit0){ range = t1; t2 = (t2 - 2017)>>>0; } else { range = (range-t1)>>>0; code = (code- t1)>>>0; } 
        probs[p[x]] = t0 - (t2 >>> 5);
      },
      BIT_TREE = () => {
        value = 1; 
        do {
          p[0] = p[1] + value; 
          RC_BIT(0); 
          value <<= 1; 
          if (!bit0) value++; 
        } while (value < n); 
        value -= n;
      }
      
  while(dst_pos < max_size){
    len = 0;
    k = dst_pos & ((1 << pb) - 1);
    p[1] = state * 16 + k;
    RC_BIT(1);
    if (bit0) {
      k = dst_pos & ((1 << lp) - 1);
      k = k << lc | value >>> (8 - lc);
      p[1] = 1846 + 768 * k;
      offset = i = 0;
      if (state >= 7){ offset = 0x100; i = dst[dst_pos-rep0];}
      len = value = 1;
      do {
        i <<= 1;
        p[0] = p[1] + offset + (i & offset) + value; 
        RC_BIT(0);
        value <<= 1;
        offset &= bit0?~i>>>0:(value++,i);
      } while (value < 256);
      state -= state < 4 ? state : state > 9 ? 6 : 3;
      value &= 255;
      dst[dst_pos++] = value;
      len-=1;
      continue;
    } else {
      p[0] = 192 + state;
      state = state < 7 ? 0 : 3;
      RC_BIT(0);
      if (bit0) {
        rep3 = rep2; rep2 = rep1; rep1 = rep0;
        p[0] = 818;
      } else {
        p[0] += 12; RC_BIT(0);
        if (bit0) {
          p[1] += 240; RC_BIT(1);
          if (bit0) {state |= 9; len = 1;}
        } else {
          p[0] += 12; RC_BIT(0);
          if (bit0) n = rep1;
          else {
            p[0] += 12; RC_BIT(0);
            if (bit0) n = rep2; else {n = rep3; rep3 = rep2;}
            rep2 = rep1;
          }
          rep1 = rep0; rep0 = n;
        }
        if (len<1){p[0] = 1332; state |= 8;}
        else state |= 9;
      }

      if (len<1) {
        len = 2; n = 8;
        p[1] = p[0] + k * 8 + 2; RC_BIT(0);
        if (!bit0) {
          p[0]++; len = 10;
          p[1] += 128; RC_BIT(0);
          if (!bit0) {n = 256; p[1] = p[0] + n + 1; len += 8;}
        }
        BIT_TREE();
        len += value;
        if (state < 4) {
          state += 7; n = 64;
          p[1] = 304 + (len<6?len:5) * n;
          BIT_TREE();
          rep0 = value;
          if (rep0 > 3) {
            n = (value >>> 1) - 1; 
            i = 1 << n;
            rep0 = (2 | (value & 1)) << n;
            if (n < 6) p[1] = 687 + rep0 - value;
            else {
              do {
                RC_NORMALIZE();
                i >>>= 1; 
                range >>>= 1;
                if (code >= range) {code = (code-range)>>>0; rep0 += i;}
              } while (i != 16);
              p[1] = 802;
            }
            n = value = 1;
            do {
              p[0] = p[1] + value;
              value <<= 1;
              RC_BIT(0);
              if (!bit0) {value++; rep0 |= n;}
              n <<= 1;
            } while (value < i);
          }
          rep0++;
        }
      }
      if (rep0 < 1) break;
      if (rep0 > dict_size) return null;
      if (rep0 > dst_pos) return null;
      if (max_size - dst_pos < len) return null;
      do {
        value = dst[dst_pos - rep0];
        dst[dst_pos++] = value;
      } while (--len);
    }
  }
  RC_NORMALIZE();
  return dst;
}
