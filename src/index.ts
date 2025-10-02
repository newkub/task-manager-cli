import { select, text, intro, cancel, isCancel } from '@clack/prompts'
import { exit } from 'process'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tomlToJson, TomlSection } from '../transform/src/toml-json.js'

interface Task {
  name: string
  description: string
  run: string
}

interface TaskConfig {
  [key: string]: Task
}

interface CliOptions {
  query: string
  help?: boolean
  version?: boolean
  task?: string
  interactive?: boolean
}

/**
 * Display version information
 */
function showVersion(): void {
  console.log('openweb v1.0.0')
}

/**
 * Load task configuration from wtask.toml file
 */
function loadTaskConfig(): TaskConfig {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const configPath = join(__dirname, '..', 'wtask.toml')

    const configContent = readFileSync(configPath, 'utf-8')
    const tomlData = tomlToJson(configContent)

    // Convert TOML structure to TaskConfig format
    const tasks: TaskConfig = {}

    for (const [taskName, taskData] of Object.entries(tomlData)) {
      const task = taskData as any
      if (task.name && task.description && task.run) {
        tasks[taskName] = {
          name: task.name as string,
          description: task.description as string,
          run: task.run as string
        }
      }
    }

    return tasks
  } catch (error) {
    console.error('Error loading task config:', error)
    return {}
  }
}

/**
 * Create Google search URL
 */
function createGoogleSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query.trim())
  return `https://www.google.com/search?q=${encodedQuery}`
}

/**
 * Create YouTube search URL
 */
function createYouTubeSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query.trim())
  return `https://www.youtube.com/results?search_query=${encodedQuery}`
}

/**
 * Create GitHub search URL
 */
function createGitHubSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query.trim())
  return `https://github.com/search?q=${encodedQuery}`
}

/**
 * Create NPM search URL
 */
function createNpmSearchUrl(query: string): string {
  const encodedQuery = encodeURIComponent(query.trim())
  return `https://www.npmjs.com/search?q=${encodedQuery}`
}

/**
 * Create search URL based on selected task
 */
function createSearchUrl(query: string, task: string, tasks: TaskConfig): string {
  const taskConfig = tasks[task]

  if (!taskConfig) {
    // Fallback to Google search for unknown tasks
    return createGoogleSearchUrl(query)
  }

  // Extract search engine from command
  if (taskConfig.run.includes('--google')) {
    return createGoogleSearchUrl(query)
  } else if (taskConfig.run.includes('--youtube')) {
    return createYouTubeSearchUrl(query)
  } else if (taskConfig.run.includes('--github')) {
    return createGitHubSearchUrl(query)
  } else if (taskConfig.run.includes('--npm')) {
    return createNpmSearchUrl(query)
  }

  // Default fallback
  return createGoogleSearchUrl(query)
}

/**
 * Get search engine name for display
 */
function getSearchEngineName(task: string, tasks: TaskConfig): string {
  const taskConfig = tasks[task]
  return taskConfig?.name || 'Unknown'
}

/**
 * Open URL in default browser using system command
 */
async function openBrowser(url: string): Promise<void> {
  try {
    // Use appropriate command based on OS
    const isWindows = process.platform === 'win32'
    const isMac = process.platform === 'darwin'
    const isLinux = process.platform === 'linux'
    
    let command: string
    let args: string[]
    
    if (isWindows) {
      command = 'cmd'
      args = ['/c', 'start', url]
    } else if (isMac) {
      command = 'open'
      args = [url]
    } else if (isLinux) {
      command = 'xdg-open'
      args = [url]
    } else {
      throw new Error(`Unsupported platform: ${process.platform}`)
    }
    
    // Check if Bun is available, otherwise use child_process
    if (typeof Bun !== 'undefined') {
      const proc = Bun.spawn([command, ...args], {
        stdout: 'pipe',
        stderr: 'pipe'
      })
      
      await proc.exited
      
      if (proc.exitCode !== 0) {
        const errorText = await new Response(proc.stderr).text()
        throw new Error(`Failed to open browser: ${errorText}`)
      }
    } else {
      // Use Node.js child_process for built version
      const { spawn } = await import('child_process')
      const proc = spawn(command, args, { 
        detached: true, 
        stdio: 'ignore' 
      })
      
      proc.unref() // Allow parent process to exit
    }
  } catch (error) {
    throw new Error(`Cannot open browser: ${error}`)
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    query: '',
    task: 'wt' // default task
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '-h' || arg === '--help') {
      options.help = true
      return options
    }

    if (arg === '-v' || arg === '--version') {
      options.version = true
      return options
    }

    if (arg === '-i' || arg === '--interactive') {
      options.interactive = true
      continue
    }

    // Check if it's a known task (matches any task in config)
    const tasks = loadTaskConfig()
    if (tasks[arg]) {
      options.task = arg
      continue
    }

    // Collect all remaining arguments as search query
    options.query = args.slice(i).join(' ')
    break
  }

  return options
}

/**
 * Interactive mode for selecting task
 */
async function interactiveMode(): Promise<CliOptions> {
  intro('OpenWeb Search')

  const tasks = loadTaskConfig()

  if (Object.keys(tasks).length === 0) {
    console.error('No tasks found in wtask.toml')
    exit(1)
  }

  const taskOptions = Object.entries(tasks).map(([key, task]) => ({
    value: key,
    label: task.name,
    hint: task.description
  }))

  const selectedTask = await select({
    message: 'Select a search task:',
    options: taskOptions
  }) as string

  if (isCancel(selectedTask)) {
    exit(0)
  }

  const query = await text({
    message: 'Enter your search query:',
    placeholder: 'e.g. how to code in typescript',
    validate(value) {
      if (!value) return 'Please enter a search query'
    }
  })

  if (isCancel(query)) {
    exit(0)
  }

  return {
    query: query as string,
    task: selectedTask,
    interactive: true
  }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // If no arguments, run interactive mode
    const options = await interactiveMode()
    return executeSearch(options)
  }

  const options = parseArgs(args)

  if (options.help) {
    console.log(`
Usage: openweb [options] <search query>

Options:
  -h, --help         Show this help message
  -v, --version      Show version
  -i, --interactive  Interactive mode

Available tasks:
${Object.entries(loadTaskConfig()).map(([key, task]) => `  ${key}              ${task.description}`).join('\n')}

Examples:
  openweb "how to code in typescript"
  openweb wt "react tutorial"
  openweb gg "javascript tutorial"
  openweb yt "express server"
  openweb -i (interactive mode)

Description:
  Opens your search query in your default browser with the selected search task.
  `)
    return
  }

  if (options.version) {
    showVersion()
    return
  }

  // If interactive flag is set, run interactive mode
  if (options.interactive) {
    const interactiveOptions = await interactiveMode()
    return executeSearch(interactiveOptions)
  }

  if (!options.query.trim()) {
    console.error('Error: Please provide a search query')
    console.log(`
Usage: openweb [options] <search query>

Options:
  -h, --help         Show this help message
  -v, --version      Show version
  -i, --interactive  Interactive mode

Available tasks:
${Object.entries(loadTaskConfig()).map(([key, task]) => `  ${key}              ${task.description}`).join('\n')}

Examples:
  openweb "how to code in typescript"
  openweb wt "react tutorial"
  openweb gg "javascript tutorial"
  openweb yt "express server"
  openweb -i (interactive mode)

Description:
  Opens your search query in your default browser with the selected search task.
  `)
    process.exit(1)
  }

  return executeSearch(options)
}

/**
 * Execute the search with given options
 */
async function executeSearch(options: CliOptions): Promise<void> {
  try {
    const tasks = loadTaskConfig()
    const task = options.task || 'wt'

    if (!tasks[task]) {
      console.error(`Unknown task: ${task}`)
      process.exit(1)
    }

    const searchUrl = createSearchUrl(options.query, task, tasks)
    console.log(`Opening ${getSearchEngineName(task, tasks)} search for: "${options.query}"`)
    console.log(`URL: ${searchUrl}`)

    await openBrowser(searchUrl)
    console.log('Search opened in your default browser!')
    // Exit immediately after opening the browser
    exit(0)
  } catch (error) {
    console.error('Error opening browser:', error)
    process.exit(1)
  }
}

// Run the CLI
main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})