export type ManagerStatus = "created" | "initialized";

export interface InitializableManager {
  readonly status: ManagerStatus;
  readonly isInitialized: boolean;
  initialize(): Promise<void>;
}

export abstract class BaseManager implements InitializableManager {
  private managerStatus: ManagerStatus = "created";

  get status(): ManagerStatus {
    return this.managerStatus;
  }

  get isInitialized(): boolean {
    return this.managerStatus === "initialized";
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.onInitialize();
    this.managerStatus = "initialized";
  }

  protected async onInitialize(): Promise<void> {}
}
