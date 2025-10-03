#!/usr/bin/env bun

import { Task } from "./config";

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

    const proc = Bun.spawn({
      cmd: [cmd, ...args],
      stdout: "inherit",
      stderr: "inherit",
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
