// Assemble parts/*.html → feuille-de-route.html (typographie française),
// puis rend le PDF avec Chrome sans interface.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const parts = readdirSync(path.join(dir, 'parts')).filter((f) => f.endsWith('.html')).sort()
let html = parts.map((f) => readFileSync(path.join(dir, 'parts', f), 'utf8')).join('\n')

const NBSP = ' ', NNBSP = ' '
const typo = (t) => t
  .replace(/ +:(?=\s|$|<)/g, NBSP + ':').replace(/ +:(?=[^/\w])/g, NBSP + ':')
  .replace(/ +([;!?])/g, NNBSP + '$1')
  .replace(/« +/g, '«' + NBSP).replace(/ +»/g, NBSP + '»')
const protectedRe = /(<style[\s\S]*?<\/style>|<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<svg[\s\S]*?<\/svg>|<[^>]+>)/g
html = html.split(protectedRe).map((seg, i) => (i % 2 ? seg : typo(seg))).join('')

const out = path.join(dir, 'feuille-de-route.html')
writeFileSync(out, html)
const pdf = process.argv[2] ?? path.resolve(dir, '../../PleasantStay_Fonctionnalites_a_ajouter.pdf')
execFileSync('google-chrome', ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  '--run-all-compositor-stages-before-draw', '--virtual-time-budget=5000',
  `--print-to-pdf=${pdf}`, pathToFileURL(out).href], { stdio: 'inherit' })
console.log('PDF :', pdf)
