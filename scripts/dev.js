const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const shellCommand = process.platform === "win32" ? "cmd.exe" : "sh";
const shellArgs = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm run dev"]
  : ["-c", "npm run dev"];
const children = [];
let shuttingDown = false;

function prefixStream(stream, label, write) {
  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.filter(Boolean).forEach((line) => write(`[${label}] ${line}\n`));
  });
}

function start(label, folder) {
  let child;
  try {
    child = spawn(shellCommand, shellArgs, {
      cwd: path.join(root, folder),
      env: { ...process.env, FORCE_COLOR: "1" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    process.stderr.write(`[${label}] failed to start: ${error.message}\n`);
    process.exit(1);
  }

  children.push(child);
  prefixStream(child.stdout, label, (line) => process.stdout.write(line));
  prefixStream(child.stderr, label, (line) => process.stderr.write(line));

  child.on("error", (error) => {
    process.stderr.write(`[${label}] failed to start: ${error.message}\n`);
  });

  child.on("close", (code) => {
    if (!shuttingDown) {
      shuttingDown = true;
      stopAll();
      process.exit(code || 0);
    }
  });
}

function stopAll() {
  children.forEach((child) => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  });
}

process.on("SIGINT", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shuttingDown = true;
  stopAll();
  process.exit(0);
});

start("backend", "backend");
start("frontend", "frontend");
