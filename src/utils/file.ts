export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function getFileTypeCategory(mimeType: string, filename: string): 'image' | 'pdf' | 'doc' | 'archive' | 'audio' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image'
  }
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return 'pdf'
  }
  if (
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('text') ||
    ['doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'ppt', 'pptx'].includes(ext)
  ) {
    return 'doc'
  }
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('rar') ||
    ['zip', 'rar', '7z', 'gz'].includes(ext)
  ) {
    return 'archive'
  }
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return 'audio'
  }

  return 'other'
}

