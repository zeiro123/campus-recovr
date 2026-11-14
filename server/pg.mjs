// Manages Campus RecovR's own PostgreSQL 18 cluster (data in ../.pgdata, port 5435).
// KEY FIX: the postmaster must be started with a MINIMAL environment. When started
// from an agent/Hermes shell, its large env block is inherited by postgres child
// processes, which then crash with 0xC0000142 (STATUS_DLL_INIT_FAILED) on Windows.
// Start I/O is redirected to a file so the long-lived postgres process never holds
// the calling terminal's pipe open.
// Untouched: system service (5432), Black Heron cluster (5433), Loopback db (5434).
// Usage: node server/pg.mjs start|stop|status
import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, openSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pgPort = 5435
const serverDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(serverDir, '..')
const dataDir = path.join(projectRoot, '.pgdata')
const logFile = path.join(dataDir, 'pg.log')
const pgCtl = path.join('C:', 'Program Files', 'PostgreSQL', '18', 'bin', 'pg_ctl.exe')

const command = process.argv[2]

if (!existsSync(pgCtl) || !existsSync(dataDir)) {
  console.error('Local PostgreSQL cluster not found (.pgdata missing next to server/).')
  process.exit(1)
}

// Minimal env the Windows loader needs — prevents the child-process DLL crash.
// Machine-specific: HOMEPATH/USERNAME match this user account.
const cleanEnv = {
  SYSTEMROOT: 'C:\\Windows',
  SYSTEMDRIVE: 'C:',
  TEMP: 'C:\\Windows\\Temp',
  TMP: 'C:\\Windows\\Temp',
  HOMEDRIVE: 'C:',
  HOMEPATH: '\\Users\\testimony.chimbereng.ECONETZW',
  USERNAME: 'testimony.chimbereng',
  PATH: 'C:\\Program Files\\PostgreSQL\\18\\bin;C:\\Windows\\System32',
}

switch (command) {
  case 'start': {
    const out = openSync(path.join(projectRoot, 'pg-start.log'), 'w')
    const result = spawnSync(pgCtl, ['-D', dataDir, '-o', `-p ${pgPort}`, '-l', logFile, 'start'], { stdio: ['ignore', out, out], env: cleanEnv })
    closeSync(out)
    if (result.status === 0) console.log(`PostgreSQL cluster started on port ${pgPort}`)
    else process.exitCode = result.status ?? 1
    break
  }
  case 'stop':
    run(['-D', dataDir, 'stop', '-m', 'fast'])
    break
  case 'status':
    run(['-D', dataDir, 'status'])
    break
  default:
    console.log('Usage: node server/pg.mjs start|stop|status')
}

function run(args) {
  const result = spawnSync(pgCtl, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exitCode = result.status ?? 1
}
