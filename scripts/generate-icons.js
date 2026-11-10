import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const svgPath = path.resolve('public', 'favicon.svg')
const svgBuffer = fs.readFileSync(svgPath)

async function generate() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public', 'icon-192.png'))

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public', 'icon-512.png'))

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve('public', 'apple-touch-icon.png'))

  console.log('Icons generated successfully!')
}

generate().catch(console.error)

