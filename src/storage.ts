export function restore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('yiku.' + key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function persist<T>(key: string, value: T) {
  localStorage.setItem('yiku.' + key, JSON.stringify(value))
}

export async function garmentPhoto(file: File, format = 'image/webp'): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw Error('Image processing unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(format, 0.8)
  } finally {
    bitmap.close()
  }
}
