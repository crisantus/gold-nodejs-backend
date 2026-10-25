import { spawn } from "node:child_process";

/** Execute trusted commands with argument arrays; project names never reach a shell. */
export async function run(
  command: string,
  args: string[],
  cwd: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell: false });
    child.once("error", reject);
    child.once("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${command} ${args[0] ?? ""} failed (${signal ?? code}).`,
            ),
          ),
    );
  });
}
