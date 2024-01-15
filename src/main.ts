import { TextEditor, ExtensionContext, window, commands } from 'vscode';
import { Repl } from './repl';
import { Logger } from './logging';
import { Config } from './config';
import { History } from './history';
import { GPT } from './gpt';

export function activate(context: ExtensionContext) {
    const config = new Config(context);
    const logger = new Logger(window.createOutputChannel('GPTEval'));
    const gpt = new GPT(
        logger,
        config.openAIModel(),
        config.openAIKey(),
        config.openAIOrg(),
        config.promptPath(),
        config.usePromptInCurrentDirectory(),
        config.expressionRegex()
    );

    const history = new History(logger, config);

    function getRepl(
        repls: Map<TextEditor, Repl>,
        textEditor: TextEditor | undefined
    ): Repl | undefined {
        if (textEditor === undefined) {
            return undefined;
        }
        if (!repls.has(textEditor)) {
            repls.set(
                textEditor,
                new Repl(
                    gpt,
                    textEditor,
                    history,
                    config,
                    window.createTextEditorDecorationType
                )
            );
        }
        return repls.get(textEditor);
    }

    const repls = new Map<TextEditor, Repl>();

    const evalCommand = commands.registerCommand(
        'gpteval.eval',
        function (args?: { [key: string]: any }) {
            const repl = getRepl(repls, window.activeTextEditor);
            if (repl !== undefined) {
                repl.evaluate(true);
            }
        }
    );

    const killCommand = commands.registerCommand('gpteval.kill', function () {
        const repl = getRepl(repls, window.activeTextEditor);
        if (repl !== undefined) {
            repl.kill();
        }
    });

    context.subscriptions.push(evalCommand, killCommand);
}

export function deactivate() {}
