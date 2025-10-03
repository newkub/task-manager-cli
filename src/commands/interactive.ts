#!/usr/bin/env bun

import { select } from "@clack/prompts";
import { loadConfig } from "../core/config";
import { executeTask } from "./execute";

export async function runInteractive(): Promise<void> {
  const tasks = loadConfig();

  if (Object.keys(tasks).length === 0) {
    console.error("No tasks found in configuration");
    process.exit(1);
  }

  const taskChoices = Object.entries(tasks).map(([alias, task]) => ({
    value: alias,
    label: `${alias} - ${task.name}`,
    hint: task.description,
  }));

  // Setup graceful exit for interactive mode
  const cleanup = () => {
    if (process.stdout.isTTY) {
      process.stdout.write('\x1b[?25h'); // Show cursor
      process.stdout.write('\n');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);

  try {
    const selectedTask = await select({
      message: "Select a task to run:",
      options: taskChoices,
    });

    await executeTask(selectedTask as string, tasks);
  } catch (error) {
    // Handle cancellation - exit immediately
    cleanup();
  }
}