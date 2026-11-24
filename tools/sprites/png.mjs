// PNG de 8 bits sin dependencias: leer (RGBA o RGB) y escribir (RGBA).
// Una imagen es { w, h, data: Uint8ClampedArray (RGBA) }.

import { deflateSync, inflateSync, crc32 } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function decode(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('No es un PNG');
  let header = null;
  const idat = [];
  for (let at = 8; at < buffer.length;) {
    const size = buffer.readUInt32BE(at);
    const type = buffer.toString('latin1', at + 4, at + 8);
    const body = buffer.subarray(at + 8, at + 8 + size);
    if (type === 'IHDR') header = { w: body.readUInt32BE(0), h: body.readUInt32BE(4), depth: body[8], color: body[9], interlace: body[12] };
    else if (type === 'IDAT') idat.push(body);
    at += 12 + size;
  }
  const { w, h, depth, color, interlace } = header;
  const channels = { 2: 3, 6: 4 }[color];
  if (depth !== 8 || !channels) throw new Error('Solo PNG de 8 bits por canal, RGB o RGBA');
  const raw = inflateSync(Buffer.concat(idat));
  const data = new Uint8ClampedArray(w * h * 4);
  const paeth = (p, q, r) => {
    const [dp, dq, dr] = [Math.abs(q - r), Math.abs(p - r), Math.abs(p + q - 2 * r)];
    if (dp <= dq && dp <= dr) return p;
    return dq <= dr ? q : r;
  };
  // Entrelazado (Adam7): siete pasadas, cada una con una parte de los pixeles; si no, una sola
  const passes = interlace
    ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]
    : [[0, 0, 1, 1]];
  let at = 0;
  for (const [x0, y0, dx, dy] of passes) {
    const pw = Math.ceil((w - x0) / dx);
    const ph = Math.ceil((h - y0) / dy);
    if (pw <= 0 || ph <= 0) continue;
    const stride = pw * channels;
    let above = Buffer.alloc(stride);
    for (let y = 0; y < ph; y++) {
      const filter = raw[at++];
      const row = Buffer.alloc(stride);
      for (let i = 0; i < stride; i++) {
        const left = i >= channels ? row[i - channels] : 0;
        const up = above[i];
        const corner = i >= channels ? above[i - channels] : 0;
        row[i] = raw[at++] + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? (left + up) >> 1 : filter === 4 ? paeth(left, up, corner) : 0);
      }
      for (let x = 0; x < pw; x++) {
        const j = ((y0 + y * dy) * w + x0 + x * dx) * 4;
        for (let c = 0; c < 3; c++) data[j + c] = row[x * channels + c];
        data[j + 3] = channels === 4 ? row[x * 4 + 3] : 255;
      }
      above = row;
    }
  }
  return { w, h, data };
}

export function encode({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const chunk = (type, body) => {
    const out = Buffer.alloc(12 + body.length);
    out.writeUInt32BE(body.length, 0);
    out.write(type, 4, 'latin1');
    body.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)) >>> 0, 8 + body.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export const image = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });
