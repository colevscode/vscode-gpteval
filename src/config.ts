import * as vscode from 'vscode';

export class Config {
    readonly getConfiguration = vscode.workspace.getConfiguration;
    readonly configSection: string = 'gpteval';
    private workspaceState: vscode.Memento;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.workspaceState = this.context.workspaceState;
    }

    public getExtensionId() {
        return 'gpteval.vscode-gpteval';
    }

    public getPreferencesStringFor(s: string) {
        return `${this.configSection}.${s}`;
    }

    public getWorkspaceState<T>(key: string) {
        return this.workspaceState.get<T>(`${this.configSection}.${key}`);
    }

    public updateWorkspaceState(key: string, value: any) {
        return this.workspaceState.update(
            `${this.configSection}.${key}`,
            value
        );
    }

    public openAIModel(): string | null {
        return this.getConfiguration(this.configSection).get(
            'openAIModel',
            null
        );
    }

    public openAIOrg(): string | null {
        return this.getConfiguration(this.configSection).get('openAIOrg', null);
    }

    public openAIKey(): string | null {
        return this.getConfiguration(this.configSection).get('openAIKey', null);
    }

    public promptPath(): string | null {
        return this.getConfiguration(this.configSection).get(
            'promptPath',
            null
        );
    }
    public usePromptInCurrentDirectory(): boolean {
        return this.getConfiguration(this.configSection).get(
            'usePromptInCurrentDirectory',
            false
        );
    }

    public expressionRegex(): string {
        return this.getConfiguration(this.configSection).get(
            'expressionRegex',
            '(?:^--/s?([/S/s]*)$)+'
        );
    }

    public feedbackColor(): string {
        return this.getConfiguration(this.configSection).get(
            'feedbackColor',
            'rgba(100,250,100,0.3)'
        );
    }

    public showEvalCount(): boolean {
        return this.getConfiguration(this.configSection).get(
            'showEvalCount',
            false
        );
    }

    public evalCountPrefix(): string {
        return this.getConfiguration(this.configSection).get(
            'evalCountPrefix',
            'Evals: '
        );
    }
}
