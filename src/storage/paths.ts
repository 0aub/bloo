import path from 'node:path';

export function getProjectRoot(): string {
  return process.env.BLOO_PROJECTS_ROOT || process.env.BLOO_PROJECT_ROOT || process.cwd();
}

export function getExportPath(projectPath: string, exportDir: string, format: string): string {
  return path.join(projectPath, exportDir, `board.${format}`);
}
