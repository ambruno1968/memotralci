import fs from 'fs'
import sharp from 'sharp'

async function buildBrandAssets() {
  console.log('Building brand assets and icons...')

  // Step 1: Make sure transparent Come Tralci logo is available
  const rawLogo = await sharp('src/logo.png').trim().raw().toBuffer({ resolveWithObject: true })
  const transparentBuffer = Buffer.alloc(rawLogo.data.length)
  for (let i = 0; i < rawLogo.data.length; i += 4) {
    const r = rawLogo.data[i]
    const g = rawLogo.data[i + 1]
    const b = rawLogo.data[i + 2]
    const lightness = r * 0.299 + g * 0.587 + b * 0.114
    if (lightness > 248) {
      transparentBuffer[i] = 255
      transparentBuffer[i + 1] = 255
      transparentBuffer[i + 2] = 255
      transparentBuffer[i + 3] = 0
    } else {
      const alpha = Math.min(255, Math.max(0, Math.round((255 - lightness) * (255 / (255 - 120)))))
      transparentBuffer[i] = r
      transparentBuffer[i + 1] = g
      transparentBuffer[i + 2] = b
      transparentBuffer[i + 3] = alpha
    }
  }

  const logoTransPng = await sharp(transparentBuffer, {
    raw: { width: rawLogo.info.width, height: rawLogo.info.height, channels: 4 },
  })
    .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer()

  fs.writeFileSync('public/logo-transparent.png', logoTransPng)
  const logoBase64 = `data:image/png;base64,${logoTransPng.toString('base64')}`

  // Step 2: Create App Icon SVG (512x512)
  // Blends:
  // - Premium Teal & Emerald Squircle
  // - 3D Realistic Desk/Tear-off Calendar Card
  // - Metallic binder spirals
  // - Top Calendar Month bar "MEMO TRALCI"
  // - Calendar week headers & date grid
  // - The original "COME TRALCI NOVARA" artwork seamlessly blended inside the calendar sheet
  // - Dynamic active event indicator with date badge
  const iconSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <!-- Squircle Gradient -->
      <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#042f2e"/>
        <stop offset="35%" stop-color="#0f5b66"/>
        <stop offset="70%" stop-color="#0d9488"/>
        <stop offset="100%" stop-color="#14b8a6"/>
      </linearGradient>

      <!-- Calendar Header Gradient -->
      <linearGradient id="cal-header" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f5b66"/>
        <stop offset="60%" stop-color="#0d9488"/>
        <stop offset="100%" stop-color="#10b981"/>
      </linearGradient>

      <!-- Binder Spiral Gradient -->
      <linearGradient id="spiral-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="45%" stop-color="#e2e8f0"/>
        <stop offset="85%" stop-color="#94a3b8"/>
        <stop offset="100%" stop-color="#64748b"/>
      </linearGradient>

      <!-- Calendar Sheet Drop Shadow -->
      <filter id="cal-shadow" x="-20%" y="-15%" width="140%" height="140%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#021c1e" flood-opacity="0.45"/>
      </filter>

      <!-- Subtle Accent Glow -->
      <filter id="accent-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#14b8a6" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- App Squircle Base (iOS/Android maskable standard) -->
    <rect width="512" height="512" rx="116" fill="url(#bg-grad)"/>

    <!-- Subtle Background Calendar Schedule Grid lines -->
    <g opacity="0.08" stroke="#ffffff" stroke-width="2" stroke-linecap="round">
      <line x1="72" y1="128" x2="440" y2="128"/>
      <line x1="72" y1="256" x2="440" y2="256"/>
      <line x1="72" y1="384" x2="440" y2="384"/>
      <line x1="132" y1="64" x2="132" y2="448"/>
      <line x1="256" y1="64" x2="256" y2="448"/>
      <line x1="380" y1="64" x2="380" y2="448"/>
    </g>

    <!-- Stacked back sheet for 3D realism -->
    <rect x="74" y="86" width="364" height="358" rx="36" fill="#ffffff" opacity="0.55" transform="rotate(-2.2 256 265)" filter="url(#cal-shadow)"/>

    <!-- Main Front Calendar Page -->
    <g filter="url(#cal-shadow)">
      <!-- Pure White Page Sheet -->
      <rect x="76" y="84" width="360" height="360" rx="36" fill="#ffffff"/>

      <!-- Calendar Top Bar -->
      <path d="M 76 120 C 76 100.1 92.1 84 112 84 L 400 84 C 419.9 84 436 100.1 436 120 L 436 166 L 76 166 Z" fill="url(#cal-header)"/>

      <!-- Top Bar Title -->
      <text x="256" y="133" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', Roboto, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="4">MEMO TRALCI</text>

      <!-- Calendar Spiral Rings -->
      <!-- Spiral 1 -->
      <rect x="134" y="62" width="22" height="46" rx="11" fill="url(#spiral-grad)"/>
      <ellipse cx="145" cy="102" rx="7" ry="3.5" fill="#042f2e" opacity="0.4"/>
      <!-- Spiral 2 -->
      <rect x="245" y="62" width="22" height="46" rx="11" fill="url(#spiral-grad)"/>
      <ellipse cx="256" cy="102" rx="7" ry="3.5" fill="#042f2e" opacity="0.4"/>
      <!-- Spiral 3 -->
      <rect x="356" y="62" width="22" height="46" rx="11" fill="url(#spiral-grad)"/>
      <ellipse cx="367" cy="102" rx="7" ry="3.5" fill="#042f2e" opacity="0.4"/>

      <!-- Days of Week mini track -->
      <g opacity="0.9" transform="translate(98, 184)">
        <text x="0" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">L</text>
        <text x="52" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">M</text>
        <text x="105" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">M</text>
        <text x="158" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">G</text>
        <text x="210" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#94a3b8" text-anchor="middle">V</text>
        <text x="263" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#0d9488" text-anchor="middle">S</text>
        <text x="316" y="0" font-family="sans-serif" font-size="11" font-weight="700" fill="#e11d48" text-anchor="middle">D</text>
      </g>
      <line x1="88" y1="196" x2="424" y2="196" stroke="#f1f5f9" stroke-width="2"/>

      <!-- The blended COME TRALCI NOVARA Logo -->
      <image href="${logoBase64}" x="92" y="210" width="328" height="160" preserveAspectRatio="xMidYMid meet"/>

      <!-- Bottom Calendar Activity Footer Banner -->
      <g transform="translate(100, 386)">
        <rect x="0" y="0" width="312" height="38" rx="19" fill="#f0fdfa" stroke="#ccfbf1" stroke-width="1.5"/>
        
        <!-- Checkmark Badge -->
        <circle cx="22" cy="19" r="9" fill="#0d9488"/>
        <path d="M 18 19 L 21 22 L 26 16" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        
        <text x="38" y="24" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="800" fill="#0f5b66">AGENDA &amp; NOTE</text>

        <!-- Dynamic Date Pill -->
        <rect x="246" y="6" width="56" height="26" rx="13" fill="#0d9488"/>
        <text x="274" y="24" font-family="sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">CAL</text>
      </g>
    </g>
  </svg>
  `

  // Step 3: Write SVG favicon and icons
  fs.writeFileSync('public/favicon.svg', iconSvg)
  console.log('Saved public/favicon.svg')

  // Generate PNG icons from SVG
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile('public/icon-512.png')
  console.log('Saved public/icon-512.png')

  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile('public/icon-192.png')
  console.log('Saved public/icon-192.png')

  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile('public/apple-touch-icon.png')
  console.log('Saved public/apple-touch-icon.png')

  // Step 4: Create a Dedicated Brand Header Logo (Horizontal with Calendar Emblem)
  // For use in the Navbar, Splash, and Modals
  const brandSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="140" viewBox="0 0 600 140">
    <defs>
      <linearGradient id="brand-cal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f5b66"/>
        <stop offset="100%" stop-color="#0d9488"/>
      </linearGradient>
      <filter id="logo-drop" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#042f2e" flood-opacity="0.18"/>
      </filter>
    </defs>

    <!-- Mini Calendar Emblem on the Left (120x120) -->
    <g transform="translate(10, 10)" filter="url(#logo-drop)">
      <rect width="120" height="120" rx="28" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
      <!-- Header bar -->
      <path d="M 0 28 C 0 12.5 12.5 0 28 0 L 92 0 C 107.5 0 120 12.5 120 28 L 120 38 L 0 38 Z" fill="url(#brand-cal-grad)"/>
      <!-- Rings -->
      <rect x="28" y="-4" width="8" height="16" rx="4" fill="#cbd5e1"/>
      <rect x="56" y="-4" width="8" height="16" rx="4" fill="#cbd5e1"/>
      <rect x="84" y="-4" width="8" height="16" rx="4" fill="#cbd5e1"/>
      <!-- Calendar Icon Symbol inside mini card -->
      <image href="${logoBase64}" x="10" y="44" width="100" height="66" preserveAspectRatio="xMidYMid meet"/>
    </g>

    <!-- App Brand Text on Right -->
    <g transform="translate(148, 48)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', Roboto, sans-serif" font-size="34" font-weight="900" fill="#0f5b66" letter-spacing="-0.5">MEMO<tspan fill="#0d9488">TRALCI</tspan></text>
      <text x="2" y="24" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="700" fill="#64748b" letter-spacing="2">AGENDA • CALENDARIO • ALLEGATI</text>
      
      <!-- Live Sync Tag -->
      <rect x="2" y="38" width="168" height="22" rx="11" fill="#f0fdfa" stroke="#ccfbf1" stroke-width="1"/>
      <circle cx="12" cy="49" r="4" fill="#10b981"/>
      <text x="22" y="53" font-family="sans-serif" font-size="10" font-weight="700" fill="#0f766e">COME TRALCI • NOVARA</text>
    </g>
  </svg>
  `

  fs.writeFileSync('public/brand-logo.svg', brandSvg)
  await sharp(Buffer.from(brandSvg))
    .png({ quality: 100 })
    .toFile('public/brand-logo.png')
  console.log('Saved public/brand-logo.png and public/brand-logo.svg')

  // Copy to dist if dist exists
  if (fs.existsSync('dist')) {
    fs.copyFileSync('public/favicon.svg', 'dist/favicon.svg')
    fs.copyFileSync('public/icon-512.png', 'dist/icon-512.png')
    fs.copyFileSync('public/icon-192.png', 'dist/icon-192.png')
    fs.copyFileSync('public/apple-touch-icon.png', 'dist/apple-touch-icon.png')
    fs.copyFileSync('public/brand-logo.svg', 'dist/brand-logo.svg')
    fs.copyFileSync('public/brand-logo.png', 'dist/brand-logo.png')
    console.log('Copied updated icons to dist/')
  }

  console.log('Brand assets generation finished successfully!')
}

buildBrandAssets().catch((err) => {
  console.error(err)
  process.exit(1)
})
