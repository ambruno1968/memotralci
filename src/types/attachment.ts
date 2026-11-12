export interface UploadedAttachment {
  id: string
  name: string
  mimeType: string
  size: number
  webViewLink?: string
  webContentLink?: string
  thumbnailLink?: string
  createdTime: string
  isLocal?: boolean
  category?: string
  categories?: string[]
}

