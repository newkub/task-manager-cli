#!/usr/bin/env bun

export function showHelp(): void {
  console.log(`
Task Manager CLI

Usage:
  wtask [task-alias]  Run a specific task
  wtask --interactive  Interactive task selection
  wtask --help         Show this help

Examples:
  wtask wt "search query"     Run web search task
  wtask -i                    Interactive mode
  wtask --help                Show this help
  `);
}