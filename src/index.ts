#!/usr/bin/env bun

import { parseArgs } from "util";
import { showHelp } from "./commands/help";
import { runInteractive } from "./commands/interactive";
import { executeTask } from "./commands/execute";
import { loadConfig } from "./core/config";

// Setup graceful exit
function setupGracefulExit() {
  const cleanup = () => {
    // Force flush any remaining output
    if (process.stdout.writable) {
      process.stdout.write('');
    }
    if (process.stderr.writable) {
      process.stderr.write('');
    }

    // Reset terminal state
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h'); // Show cursor
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    cleanup();
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup();
  });
}

// Main function
async function main() {
  setupGracefulExit();

  const tasks = loadConfig();

  if (Object.keys(tasks).length === 0) {
    console.error("No tasks found in configuration");
    process.exit(1);
  }

  // Parse command line arguments
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean" },
      interactive: { type: "boolean", short: "i" },
    },
    allowPositionals: true,
  });

  // Handle help flag
  if (values.help) {
    showHelp();
    process.exit(0);
  }

  // Handle interactive mode
  if (values.interactive) {
    await runInteractive();
    // runInteractive will exit on cancel, so we never reach here
  }

  // Handle direct task execution
  const taskAlias = positionals[0];

  if (taskAlias) {
    await executeTask(taskAlias, tasks);
  } else {
    // No task specified, show interactive selection
    await runInteractive();
    // runInteractive will exit on cancel, so we never reach here
  }
}

// Run the CLI
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});