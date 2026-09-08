/**
 * Extract dominant color from an image URL using canvas.
 * Returns an RGB object { r, g, b }.
 */
export function getDominantColor(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const size = 40
        canvas.width = size
        canvas.height = size
        ctx.drawImage(img, 0, 0, size, size)
        const data = ctx.getImageData(0, 0, size, size).data

        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count++
        }
        resolve({
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count)
        })
      } catch {
        resolve({ r: 8, g: 12, b: 10 })
      }
    }
    img.onerror = () => resolve({ r: 8, g: 12, b: 10 })
    img.src = imageUrl
  })
}
