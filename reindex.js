const fs = require('fs')
const path = require('path')

const group = process.argv[2]
switch (group) {
  case 'samples':
    const rootFiles = fs.readdirSync(__dirname)
    const relevantFiles = rootFiles.filter(file => file.startsWith('sample') && file.endsWith('.pgn'))
    return console.log(`window.samples = ${JSON.stringify(relevantFiles)}`)
  case 'themes':
    const folderPath = path.join(__dirname, group)
    const themeFolders = fs.readdirSync(folderPath)
    return console.log(`window.themes = ${JSON.stringify(themeFolders)}`)
  case 'screenshots':
    const screenshots = {}
    const screenshotPath = process.env.SCREENSHOT_PATH
    const browsers = fs.readdirSync(screenshotPath)
    for (const browser of browsers) {
      const browserPath = path.join(screenshotPath, browser)
      const themes = fs.readdirSync(browserPath)
      for (const theme of themes) {
        const themePath = path.join(browserPath, theme)
        const devices = fs.readdirSync(themePath)
        for (const device of devices) {
          const devicePath = path.join(themePath, device)
          const schemes = fs.readdirSync(devicePath)
          for (const scheme of schemes) {
            const schemePath = path.join(devicePath, scheme)
            screenshots[browser] = screenshots[browser] || {}
            screenshots[browser][theme] = screenshots[browser][theme] || {}
            screenshots[browser][theme][device] = screenshots[browser][theme][device] || {}
            screenshots[browser][theme][device][scheme] = fs.readdirSync(schemePath)
          }
        }
      }
    }
    return console.log(`window.screenshots = ${JSON.stringify(screenshots)}`)
}
