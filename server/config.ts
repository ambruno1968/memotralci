import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { inspectCredentials, isOAuthConnected } from './googleClient.js'

dotenv.config()

export interface AppConfig {
  port: number
  serviceAccountPath: string
  serviceAccountJson?: string
  calendarId: string
  driveFolderId: string
  isGoogleConfigured: boolean
  authType: 'service_account' | 'oauth2' | 'none'
  credentialType: 'service_account' | 'oauth_client' | 'none'
}

const serviceAccountPath =
  process.env.GOOGLE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), 'service-account.json')
const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  serviceAccountPath,
  serviceAccountJson,
  calendarId: process.env.GOOGLE_CALENDAR_ID || 'Segreteria',
  driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || 'allegati memotralci',
  isGoogleConfigured: false,
  authType: 'none',
  credentialType: 'none',
}

export function reloadConfig(): AppConfig {
  const creds = inspectCredentials(config)
  config.credentialType = creds.type

  if (creds.type === 'service_account' && creds.clientEmail && creds.raw?.private_key) {
    config.authType = 'service_account'
    config.isGoogleConfigured = true
  } else if (creds.type === 'oauth_client' && isOAuthConnected()) {
    config.authType = 'oauth2'
    config.isGoogleConfigured = true
  } else {
    config.authType = 'none'
    config.isGoogleConfigured = false
  }

  return config
}

// Initial evaluation
reloadConfig()
