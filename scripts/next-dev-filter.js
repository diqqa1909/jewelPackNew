const { spawn } = require("node:child_process");

const isWindows = process.platform === "win32";
const nextBin = isWindows ? "next.cmd" : "next";
const child = spawn(nextBin, ["dev"], {
  cwd: process.cwd(),
  env: process.env,
  shell: true,
  stdio: ["inherit", "pipe", "pipe"]
});

function writeFiltered(stream, chunk) {
  const text = chunk.toString();
  const lines = text.split(/\r?\n/);
  const endsWithNewline = /\r?\n$/.test(text);

  lines.forEach((line, index) => {
    if (!line && (endsWithNewline || index < lines.length - 1)) return;
    if (/^\s*GET \/_next\/static\/.* 404\b/.test(line)) return;
    stream.write(line + (endsWithNewline || index < lines.length - 1 ? "\n" : ""));
  });
}

child.stdout.on("data", (chunk) => writeFiltered(process.stdout, chunk));
child.stderr.on("data", (chunk) => writeFiltered(process.stderr, chunk));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
