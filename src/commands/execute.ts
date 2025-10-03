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

    // Create a promise that resolves when the process exits
    const proc = Bun.spawn({
      cmd: [cmd, ...args],
      stdout: "pipe", // Capture stdout to ensure it gets displayed
      stderr: "pipe", // Capture stderr to ensure it gets displayed
      stdin: "inherit",
      env: { ...process.env },
    });

    // Handle stdout
    const stdoutPromise = new Promise<void>((resolve) => {
      if (proc.stdout) {
        proc.stdout.pipeTo(new WritableStream({
          write(data) {
            process.stdout.write(data);
          },
          close() {
            resolve();
          }
        }));
      } else {
        resolve();
      }
    });

    // Handle stderr
    const stderrPromise = new Promise<void>((resolve) => {
      if (proc.stderr) {
        proc.stderr.pipeTo(new WritableStream({
          write(data) {
            process.stderr.write(data);
          },
          close() {
            resolve();
          }
        }));
      } else {
        resolve();
      }
    });

    // Wait for both stdout and stderr to complete
    await Promise.all([stdoutPromise, stderrPromise]);

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