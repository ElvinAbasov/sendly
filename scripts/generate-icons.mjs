import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  const crcData = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(crcData))
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function createPNG(size, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rawData = Buffer.alloc((size * size * 3 + size) * size)
  let offset = 0
  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2
      const cy = y - size / 2
      const dist = Math.sqrt(cx * cx + cy * cy)
      const radius = size * 0.38

      if (dist < radius) {
        rawData[offset++] = 255
        rawData[offset++] = 255
        rawData[offset++] = 255
      } else if (dist < radius + size * 0.02) {
        const t = (dist - radius) / (size * 0.02)
        rawData[offset++] = Math.round(255 * (1 - t) + r * t)
        rawData[offset++] = Math.round(255 * (1 - t) + g * t)
        rawData[offset++] = Math.round(255 * (1 - t) + b * t)
      } else {
        rawData[offset++] = r
        rawData[offset++] = g
        rawData[offset++] = b
      }
    }
  }

  const compressed = deflateSync(rawData.subarray(0, offset))

  const ihdrChunk = createChunk('IHDR', ihdr)
  const idatChunk = createChunk('IDAT', compressed)
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

mkdirSync(publicDir, { recursive: true })

for (const size of [192, 512]) {
  const png = createPNG(size, 99, 102, 241)
  writeFileSync(join(publicDir, `pwa-${size}x${size}.png`), png)
  console.log(`Created pwa-${size}x${size}.png`)
}
