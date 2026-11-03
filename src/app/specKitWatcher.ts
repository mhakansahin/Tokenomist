// Watches the Spec Kit layout of one workspace folder (FR-002, research.md R2).

import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export interface ActiveFeature {
  /** As written in .specify/feature.json, e.g. "specs/001-spec-model-routing". */
  featureDir: string;
  absoluteDir: string;
}

const DEBOUNCE_MS = 400;

export class SpecKitWatcher implements vscode.Disposable {
  private readonly featureChangedEmitter = new vscode.EventEmitter<ActiveFeature | undefined>();
  private readonly specSavedEmitter = new vscode.EventEmitter<ActiveFeature>();
  private readonly planCreatedEmitter = new vscode.EventEmitter<ActiveFeature>();
  private readonly tasksChangedEmitter = new vscode.EventEmitter<ActiveFeature>();
  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private active: ActiveFeature | undefined;

  readonly onFeatureChanged = this.featureChangedEmitter.event;
  readonly onSpecSaved = this.specSavedEmitter.event;
  readonly onPlanCreated = this.planCreatedEmitter.event;
  readonly onTasksChanged = this.tasksChangedEmitter.event;

  constructor(private readonly folder: vscode.WorkspaceFolder) {}

  get root(): string {
    return this.folder.uri.fsPath;
  }

  get activeFeature(): ActiveFeature | undefined {
    return this.active;
  }

  async start(): Promise<void> {
    this.active = await this.readActiveFeature();
    const featureWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.folder, ".specify/feature.json"),
    );
    const docsWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.folder, "**/{spec,plan,tasks}.md"),
    );
    const onFeature = () => this.debounce("feature", () => void this.refreshActiveFeature());
    const onDoc = (uri: vscode.Uri, created: boolean) => this.handleDoc(uri, created);
    this.disposables.push(
      featureWatcher,
      docsWatcher,
      featureWatcher.onDidCreate(onFeature),
      featureWatcher.onDidChange(onFeature),
      featureWatcher.onDidDelete(onFeature),
      docsWatcher.onDidCreate((uri) => onDoc(uri, true)),
      docsWatcher.onDidChange((uri) => onDoc(uri, false)),
    );
  }

  async isSpecKitWorkspace(): Promise<boolean> {
    return exists(path.join(this.root, ".specify", "feature.json"));
  }

  async readSpec(feature = this.active): Promise<string | undefined> {
    return feature ? readIfExists(path.join(feature.absoluteDir, "spec.md")) : undefined;
  }

  async readTasks(feature = this.active): Promise<string | undefined> {
    return feature ? readIfExists(path.join(feature.absoluteDir, "tasks.md")) : undefined;
  }

  async hasPlan(feature = this.active): Promise<boolean> {
    return feature ? exists(path.join(feature.absoluteDir, "plan.md")) : false;
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    vscode.Disposable.from(
      ...this.disposables,
      this.featureChangedEmitter,
      this.specSavedEmitter,
      this.planCreatedEmitter,
      this.tasksChangedEmitter,
    ).dispose();
  }

  private handleDoc(uri: vscode.Uri, created: boolean): void {
    const feature = this.active;
    if (!feature || path.dirname(uri.fsPath).toLowerCase() !== feature.absoluteDir.toLowerCase()) {
      return;
    }
    const name = path.basename(uri.fsPath);
    if (name === "spec.md") {
      this.debounce("spec", () => this.specSavedEmitter.fire(feature));
    } else if (name === "plan.md" && created) {
      this.debounce("plan", () => this.planCreatedEmitter.fire(feature));
    } else if (name === "tasks.md") {
      this.debounce("tasks", () => this.tasksChangedEmitter.fire(feature));
    }
  }

  private async refreshActiveFeature(): Promise<void> {
    const next = await this.readActiveFeature();
    if (next?.featureDir !== this.active?.featureDir) {
      this.active = next;
      this.featureChangedEmitter.fire(next);
    }
  }

  private async readActiveFeature(): Promise<ActiveFeature | undefined> {
    const text = await readIfExists(path.join(this.root, ".specify", "feature.json"));
    if (!text) {
      return undefined;
    }
    try {
      const dir = (JSON.parse(text) as { feature_directory?: unknown }).feature_directory;
      if (typeof dir !== "string" || dir.trim() === "") {
        return undefined;
      }
      const featureDir = dir.replace(/\\/g, "/").replace(/\/+$/, "");
      return { featureDir, absoluteDir: path.resolve(this.root, featureDir) };
    } catch {
      return undefined;
    }
  }

  private debounce(key: string, fn: () => void): void {
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(fn, DEBOUNCE_MS));
  }
}

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

async function exists(file: string): Promise<boolean> {
  return fs.stat(file).then(
    () => true,
    () => false,
  );
}
