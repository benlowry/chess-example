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
    const themes = fs.readdirSync(path.join(__dirname, 'themes'))
    for (const theme of themes) {
      screenshots[theme] = {}
      const devices = []
      for (const device of devices) {
        screenshots[theme][device] = {
          light: [],
          dark: []
        }
      }
    }
    return console.log(`window.screenshots = ${JSON.stringify(screenshots)}`)
}
