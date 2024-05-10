import * as vscode from 'vscode';
import { GPTEvalEditor, GPTEvalExpression } from './editor';
import { IHistory } from './history';
import { DecorationRenderOptions, TextEditorDecorationType } from 'vscode';
import { Config } from './config';
import { IGPT } from './gpt';
import { ILogger } from './logging';
// import { resolve } from 'url';

/**
 * Provides the UI commands for an interactive GPTEval session.
 */
export interface IRepl {
    kill(): Promise<void>;
    evaluate(isMultiline: boolean): Promise<void>;
}

export const DEFAULT_TEMPLATE_MARKER = RegExp(/[#](s|c)[#]/g);

export class Repl implements IRepl {
    public readonly postChannel: vscode.OutputChannel | null = null;

    constructor(
        private logger: ILogger,
        private gpt: IGPT,
        private textEditor: vscode.TextEditor,
        private history: IHistory,
        private config: Config,
        private createTextEditorDecorationType: (
            _: DecorationRenderOptions
        ) => TextEditorDecorationType
    ) {}

    public async kill() {
        // not yet implemented
        this.history.log(
            new GPTEvalExpression(new vscode.Range(0, 0, 0, 0), 'kill')
        );
    }

    public async evaluate(
        isMultiline: boolean,
        echoCommandToLogger: boolean = false
    ) {
        const block = new GPTEvalEditor(
            this.logger,
            this.textEditor,
            this.config.expressionRegex()
        ).getGPTExpressionUnderCursor(isMultiline);

        this.evaluateExpression(block, isMultiline, echoCommandToLogger);
    }

    public async evaluateExpression(
        block: GPTEvalExpression | null,
        isMultiline: boolean,
        echoCommandToLogger: boolean = false
    ) {
        if (block) {
            this.feedback(block.range);
            const result = await this.gpt.sendGPTExpression(
                block.expression,
                block.result,
                echoCommandToLogger
            );
            if (result) {
                const resultMsg = result.choices[0].message.content || '';
                new GPTEvalEditor(
                    this.logger,
                    this.textEditor,
                    this.config.expressionRegex()
                ).insertOrReplaceResult(block, resultMsg);
                block.result = resultMsg;
                this.history.log(block);
            }
        }
    }

    private feedback(range: vscode.Range): void {
        const flashDecorationType = this.createTextEditorDecorationType({
            backgroundColor: this.config.feedbackColor(),
        });
        this.textEditor.setDecorations(flashDecorationType, [range]);
        setTimeout(function () {
            flashDecorationType.dispose();
        }, 250);
    }
}
