import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config()

export interface AppConfig {
  port: number
  serviceAccountPath: string
  serviceAccountJson?: string
  calendarId: string
  driveFolderId: string
  isGoogleConfigured: boolean
}

const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), 'service-account.json')
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

const hasServiceAccount = Boolean(
  serviceAccountJson || (fs.existsSync(serviceAccountPath) && fs.statSync(serviceAccountPath).size > 0)
)

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  serviceAccountPath,
  serviceAccountJson,
  calendarId: process.env.GOOGLE_CALENDAR_ID || '',
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
  isGoogleConfigured: hasServiceAccount && Boolean(process.env.GOOGLE_CALENDAR_ID),
}

export function reloadConfig(): AppConfig {
  const saExists = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      (fs.existsSync(config.serviceAccountPath) && fs.statSync(config.serviceAccountPath).size > 0)
  )
  config.isGoogleConfigured = saExists && Boolean(process.env.GOOGLE_CALENDAR_ID)
  return config
}

