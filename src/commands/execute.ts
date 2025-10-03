#!/usr/bin/env bun

import { Task } from "../core/config";

export async function executeTask(
  taskAlias: string,
  tasks: Record<string, Task>,
): Promise<never> {
  const task = tasks[taskAlias];

  if (!task) {
    console.error(`Task '${taskAlias}' not found`);
    process.exit(1);
  }

  try {
    // Use Bun.spawn for running the command
    const command = task.run;
    const [cmd, ...args] = command.split(" ");

    // For Windows, use 'cmd' as shell for better signal handling
    const isWindows = process.platform === 'win32';
    const shellCmd = isWindows ? ['cmd', '/c'] : [cmd, ...args];

    const proc = Bun.spawn({
      cmd: shellCmd,
      args: isWindows ? [command] : args,
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env },
    });

    const result = await proc.exited;

    if (result !== 0) {
      process.exit(result);
    }

    // Exit after successful execution
    process.exit(0);
  } catch (error) {
    console.error("Error executing task:", error);
    process.exit(1);
  }
}