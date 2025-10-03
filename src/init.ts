#!/usr/bin/env bun

import { existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Get installation info
const isGlobal =
    process.env.npm_config_global === "true" ||
    process.env.npm_config_prefix?.includes(homedir());

const currentDir = process.cwd();
const rootDir = isGlobal ? homedir() : currentDir;

// Config file paths
const localConfigPath = join(currentDir, "wtask.toml");
const globalConfigPath = join(rootDir, ".wtask.toml");

const configPath = isGlobal ? globalConfigPath : localConfigPath;

console.log(`🔧 Setting up Task Manager CLI...`);
console.log(`📦 Installation type: ${isGlobal ? "Global" : "Local"}`);
console.log(`📁 Config location: ${configPath}`);

// Create directory if it doesn't exist (for global install)
if (isGlobal && !existsSync(rootDir)) {
    mkdirSync(rootDir, { recursive: true });
}

// Default config content
const defaultConfig = `# task-manager-cli Configuration
# Generated on ${new Date().toISOString()}

[gg]
name = "Node.js Version"
description = "Show Node.js version"
run = "node --version"

[wt]
name = "Web Search"
description = "General web search (Google)"
run = "echo 'Web search functionality coming soon...'"

[yt]
name = "YouTube Search"
description = "Search on YouTube"
run = "echo 'YouTube search functionality coming soon...'"

[gh]
name = "GitHub Search"
description = "Search on GitHub"
run = "echo 'GitHub search functionality coming soon...'"

[np]
name = "NPM Search"
description = "Search on NPM"
run = "echo 'NPM search functionality coming soon...'"

[wti]
name = "Interactive Mode"
description = "Interactive mode for selecting search engine"
run = "echo 'Interactive mode functionality coming soon...'"

# Usage examples:
# task-manager-cli gg    - Show Node.js version
# task-manager-cli wt    - Web search (placeholder)
# task-manager-cli --list - Show all available tasks
`;

try {
    // Check if config already exists
    if (existsSync(configPath)) {
        console.log(`✅ Config file already exists at: ${configPath}`);
    } else {
        // Create config file
        writeFileSync(configPath, defaultConfig);
        console.log(`✅ Created config file at: ${configPath}`);
    }

    console.log(`🎉 Setup complete! You can now run:`);
    if (isGlobal) {
        console.log(`   task-manager-cli --help`);
    } else {
        console.log(`   bun run dist/index.js --help`);
    }
} catch (error) {
    console.error(`❌ Error during setup:`, error);
    process.exit(1);
}
