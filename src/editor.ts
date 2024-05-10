import { Range, TextEditor, TextDocument, Selection, Position } from 'vscode';
import { ILogger } from './logging';

/**
 * Represents a single expression to be executed by GPTEval.
 */
export class GPTEvalExpression {
    public readonly expression: string;
    public result?: string;
    public readonly range: Range;

    constructor(range: Range, expression: string, result?: string) {
        this.expression = expression;
        this.result = result;
        this.range = range;
    }
}

/**
 * Represents a document of GPT commands.
 */
export class GPTEvalEditor {
    constructor(
        private logger: ILogger,
        private editor: TextEditor,
        private expRegex: string
    ) {}

    private isEmpty(document: TextDocument, line: number): boolean {
        return document.lineAt(line).text.trim().length === 0;
    }

    /**
     * Given a document and a range, find the first line which is not blank.
     * Returns null if there are no non-blank lines before the end of the selection.
     */
    private getFirstNonBlankLineInRange(
        document: TextDocument,
        range: Range
    ): number | null {
        for (
            let currentLineNumber = range.start.line;
            currentLineNumber <= range.end.line;
            currentLineNumber++
        ) {
            if (!this.isEmpty(document, currentLineNumber)) {
                return currentLineNumber;
            }
        }

        return null;
    }

    /**
     * Assuming that the start position of the range is inside an expression, search backwards for the first line
     * of that expression.
     */
    private getFirstExpressionLineBeforeSelection(
        document: TextDocument,
        range: Range
    ): number | null {
        let currentLineNumber = range.start.line;

        // If current line is empty, do not attempt to search.
        if (this.isEmpty(document, currentLineNumber)) {
            return null;
        }

        while (
            currentLineNumber >= 0 &&
            !this.isEmpty(document, currentLineNumber)
        ) {
            currentLineNumber--;
        }

        return currentLineNumber + 1;
    }

    private getStartLineNumber(
        document: TextDocument,
        range: Range
    ): number | null {
        // If current line is empty, search forward for the expression start
        if (this.isEmpty(document, range.start.line)) {
            return this.getFirstNonBlankLineInRange(document, range);
        }
        // Else, current line has contents and so an expression may start on a prior line
        return this.getFirstExpressionLineBeforeSelection(document, range);
    }

    private getEndLineNumber(
        document: TextDocument,
        startLineNumber: number
    ): number {
        let currentLineNumber = startLineNumber;
        while (
            currentLineNumber < document.lineCount &&
            !this.isEmpty(document, currentLineNumber)
        ) {
            currentLineNumber++;
        }
        return currentLineNumber - 1;
    }

    public getGPTExpressionUnderCursor(
        getMultiline: boolean
    ): GPTEvalExpression | null {
        const document = this.editor.document;
        const position = this.editor.selection.active;

        const line = document.lineAt(position);

        // If there is a single-line expression
        // TODO: decide the behaviour in case in multi-line selections
        if (!getMultiline) {
            if (this.isEmpty(document, position.line)) {
                return null;
            }
            let range = new Range(
                line.lineNumber,
                0,
                line.lineNumber,
                line.text.length
            );
            return new GPTEvalExpression(range, line.text);
        }

        // If there is a multi-line expression
        const selectedRange = new Range(
            this.editor.selection.anchor,
            this.editor.selection.active
        );
        const startLineNumber = this.getStartLineNumber(
            document,
            selectedRange
        );
        if (startLineNumber === null) {
            return null;
        }

        const endLineNumber = this.getEndLineNumber(document, startLineNumber);
        const endCol = document.lineAt(endLineNumber).text.length;

        let range = new Range(startLineNumber, 0, endLineNumber, endCol);
        let text = document.getText(range);

        // extract expression
        const re = new RegExp(this.expRegex, 'ms');
        let rest = text;
        let exp = '';
        this.logger.log('re: ' + re);

        while (rest) {
            this.logger.log('rest: ' + rest);
            const match = re.exec(rest);
            this.logger.log('match: ' + match);
            if (!match) {
                break;
            }
            exp += match[1] + '\n';
            rest = rest.slice(match.index + match[0].length);
        }

        this.logger.log('exp: ' + exp);
        // this.logger.log('rest: ' + rest);

        if (exp === '') {
            return null;
        }

        return new GPTEvalExpression(range, exp.trim(), rest.trim());
    }

    public insertOrReplaceResult(block: GPTEvalExpression, newResult: string) {
        // save current position of cursor
        const cursorPosition = this.editor.selection.active;

        // find the position of the result within the block.range
        let text = this.editor.document.getText(block.range);
        let start = block.range.start.line;
        while (text) {
            if (block.result && text.startsWith(block.result)) {
                break;
            }
            text = text
                .slice(this.editor.document.lineAt(start).text.length)
                .trim();
            start++;
        }

        const resultRange =
            start <= block.range.end.line &&
            new Range(new Position(start, 0), block.range.end);

        // replace or insert the result
        if (resultRange && !resultRange.isEmpty) {
            this.editor.edit((editBuilder) => {
                editBuilder.replace(resultRange, newResult);
            });
        } else {
            this.editor.edit((editBuilder) => {
                editBuilder.insert(block.range.end, '\n' + newResult);
            });
        }

        // restore previous position of cursor including anchor
        this.editor.selection = new Selection(cursorPosition, cursorPosition);
    }
}
