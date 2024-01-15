import { ILogger } from './logging';
import * as vscode from 'vscode';
import { homedir } from 'os';
import { OpenAI } from 'openai';

/**
 * Provides an interface to send instructions to the current OpenAI instance.
 */
export interface IGPT {
    sendGPTExpression(
        expression: string,
        echoCommandToLogger?: boolean
    ): Promise<OpenAI.Chat.ChatCompletion | undefined>;
}

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
};

export type ChatPrompt = {
    system: string;
    messages: ChatMessage[];
};

function promptsEqual(a: ChatPrompt, b: ChatPrompt): boolean {
    return (
        a.system == b.system &&
        a.messages.length == b.messages.length &&
        a.messages.every((m, i) => m.content == b.messages[i].content)
    );
}

export class GPT implements IGPT {
    openaiBooted: boolean = false;
    openAI: OpenAI | undefined = undefined;
    prompt: ChatPrompt = {
        system: 'You are a helpful assistant.',
        messages: [],
    };
    history: ChatMessage[] = [];

    lineEnding = vscode.workspace
        .getConfiguration('files', null)
        .get('eol', '\n');

    constructor(
        private logger: ILogger,
        private openAIModel: string | null,
        private openAIKey: string | null,
        private openAIOrg: string | null,
        private promptPath: string | null,
        private usePromptInCurrentDirectory: boolean,
        private expRegex: string
    ) {}

    private bootOpenAI(): boolean {
        if (this.openaiBooted) {
            return true;
        }
        if (!this.openAIKey) {
            this.logger.error('Could find openAI API key');
            return false;
        }

        this.openAI = new OpenAI({
            apiKey: this.openAIKey,
            organization: this.openAIOrg,
        });

        this.openaiBooted = true;
        return true;
    }

    private async loadPrompt(): Promise<void> {
        const promptPath = this.promptPath;
        const usePromptInCurrentDirectory = this.usePromptInCurrentDirectory;

        let uri: vscode.Uri | null = null;

        if (usePromptInCurrentDirectory) {
            const folders = vscode.workspace.workspaceFolders;

            if (folders !== undefined && folders.length > 0) {
                uri = vscode.Uri.parse(
                    `file://${folders[0].uri.path}/prompt.txt`
                );
            } else {
                this.logger.warning(
                    'You must open a folder or workspace in order to use the \
                usePromptInCurrentDirectory setting.'
                );
            }
        } else if (promptPath) {
            // expand '~' to home directory if present as first character
            const promptPathExpanded = promptPath.startsWith('~')
                ? homedir() + promptPath.substring(1)
                : promptPath;
            uri = vscode.Uri.file(`${promptPathExpanded}`);
        }

        let prompt: ChatPrompt | null = null;

        if (uri !== null) {
            prompt = await this.getPromptFromFile(uri);
        }

        if (prompt && !promptsEqual(prompt, this.prompt)) {
            this.prompt = prompt;
            let messages: ChatMessage[] = [
                { role: 'system', content: prompt.system },
                ...prompt.messages,
            ];
            this.history = messages;
            this.logger.log(
                `Loaded prompt\n` +
                    messages
                        .map((m) => (m.role == 'user' ? '>' : '') + m.content)
                        .join('\n')
            );
        }
    }

    private async getPromptFromFile(
        uri: vscode.Uri
    ): Promise<ChatPrompt | null> {
        let doc: vscode.TextDocument;
        try {
            doc = await vscode.workspace.openTextDocument(uri);
            let text = doc.getText();

            // parse out the system message
            const matchFile = text.match(/^([\s\S]*?)---+([\s\S]+$)/);
            const system = matchFile ? matchFile[1].trim() : text;
            let rest = matchFile ? matchFile[2] : '';

            // parse out any other messages
            let messages: ChatMessage[] = [];
            const re = new RegExp(this.expRegex, 'm');

            function next() {
                const matchExp = re.exec(rest);
                return [
                    matchExp
                        ? rest.slice(0, matchExp.index).trim()
                        : rest.trim(),
                    matchExp ? matchExp[1].trim() : '',
                    matchExp
                        ? rest.slice(matchExp.index + matchExp[0].length)
                        : '',
                ];
            }

            let userMsg = '',
                asstMsg,
                nextLine;

            [asstMsg, nextLine, rest] = next();

            while (rest || asstMsg) {
                if (asstMsg) {
                    if (userMsg) {
                        messages.push({ role: 'user', content: userMsg });
                        userMsg = '';
                    }
                    messages.push({ role: 'assistant', content: asstMsg });
                }
                if (nextLine) {
                    userMsg += nextLine;
                }
                [asstMsg, nextLine, rest] = next();
            }
            return { system, messages };
        } catch (e) {
            this.logger.error(
                `Failed to load boot commands from ${uri.fsPath}`
            );
            return null;
        }
    }

    public async sendGPTExpression(
        expression: string,
        echoCommandToLogger: boolean = false
    ): Promise<OpenAI.Chat.ChatCompletion | undefined> {
        if (!this.bootOpenAI() || !this.openAI) {
            this.logger.error('Could not boot OpenAI');
            return;
        }
        await this.loadPrompt();
        this.history.push({ role: 'user', content: expression });
        let response: OpenAI.Chat.ChatCompletion | undefined = undefined;
        try {
            response = await this.openAI.chat.completions.create({
                messages: [
                    ...this.history,
                    { role: 'user', content: expression },
                ],
                model: this.openAIModel || 'gpt-3.5-turbo',
            });
            if (response?.choices[0]?.message.content) {
                this.history.push({
                    role: 'assistant',
                    content: response.choices[0].message.content,
                });
            }
        } catch (e: unknown) {
            this.logger.error(
                typeof e == 'string'
                    ? e
                    : 'Unknown error while sending to OpenAI'
            );
            return;
        }
        return response;
    }
}
