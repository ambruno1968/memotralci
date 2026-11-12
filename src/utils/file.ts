export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getFileTypeCategory(
  mimeType: string,
  filename: string
): 'image' | 'pdf' | 'doc' | 'archive' | 'audio' | 'video' | 'other' {
  const mime = (mimeType || '').toLowerCase()
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image'
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf'
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'].includes(ext)) {
    return 'video'
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'opus'].includes(ext)) {
    return 'audio'
  }
  if (
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    mime.includes('opendocument') ||
    mime.includes('google-apps.document') ||
    mime.includes('google-apps.spreadsheet') ||
    mime.includes('google-apps.presentation') ||
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'md', 'json', 'xml', 'log', 'rtf'].includes(ext)
  ) {
    return 'doc'
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('rar') ||
    ['zip', 'rar', '7z', 'gz'].includes(ext)
  ) {
    return 'archive'
  }

  return 'other'
}

export function isTextFormat(mimeType: string, filename: string): boolean {
  const mime = (mimeType || '').toLowerCase()
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/xml' ||
    ['txt', 'csv', 'md', 'json', 'xml', 'log', 'yml', 'yaml', 'ini'].includes(ext)
  )
}

export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const parts = dataUrl.split(',')
    if (parts.length < 2) return null
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
    const byteString = atob(parts[1])
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    return new Blob([ab], { type: mime })
  } catch {
    return null
  }
}

