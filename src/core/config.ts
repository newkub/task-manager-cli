#!/usr/bin/env bun

import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

export interface Task {
  name: string;
  description: string;
  run: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration file paths
const LOCAL_CONFIG_PATH = join(__dirname, "../wtask.toml");
const GLOBAL_CONFIG_PATH = join(homedir(), ".wtask.toml");

// Parse TOML-like configuration (simple parser for this format)
function parseConfig(content: string): Record<string, Task> {
  const tasks: Record<string, Task> = {};
  const lines = content.split("\n");

  let currentTask = "";
  let inTask = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith("#") || trimmed === "") continue;

    // Check if this is a new task section
    if (trimmed.match(/^\[(\w+)\]$/)) {
      currentTask = trimmed.match(/^\[(\w+)\]$/)?.[1] || "";
      inTask = true;
      tasks[currentTask] = { name: "", description: "", run: "" };
      continue;
    }

    // Parse task properties
    if (inTask && currentTask && trimmed.includes("=")) {
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").trim().replace(/"/g, "");

      if (key.trim() === "name") {
        tasks[currentTask].name = value;
      } else if (key.trim() === "description") {
        tasks[currentTask].description = value;
      } else if (key.trim() === "run") {
        tasks[currentTask].run = value;
      }
    }
  }

  return tasks;
}

// Load configuration from appropriate location
export function loadConfig(): Record<string, Task> {
  // Try local config first (for local installations)
  if (existsSync(LOCAL_CONFIG_PATH)) {
    try {
      const content = readFileSync(LOCAL_CONFIG_PATH, "utf-8");
      return parseConfig(content);
    } catch (error) {
      console.error("Error loading local configuration file:", error);
    }
  }

  // Try global config (for global installations)
  if (existsSync(GLOBAL_CONFIG_PATH)) {
    try {
      const content = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
      return parseConfig(content);
    } catch (error) {
      console.error("Error loading global configuration file:", error);
    }
  }

  // No config found
  console.error("No configuration file found.");
  console.error(`Expected locations:`);
  console.error(`  Local: ${LOCAL_CONFIG_PATH}`);
  console.error(`  Global: ${GLOBAL_CONFIG_PATH}`);
  process.exit(1);

  return {};
}
