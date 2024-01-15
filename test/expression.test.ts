import { Position, Selection } from 'vscode';
import { expect, assert } from 'chai';
import { GPTEvalEditor } from '../src/editor';
import { createMockDocument, createMockEditor } from './mock';

suite('Editor', () => {
    test('Single-line expression retrieved', () => {
        let mockDocument = createMockDocument(['Hello world']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(0, 0), new Position(0, 0))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(false);

        assert.isNotNull(expression);
        if (expression !== null) {
            expect(expression.expression).to.be.equal('Hello world');
        }
    });

    test('Single-line expression between blank lines retrieved', () => {
        let mockDocument = createMockDocument(['', 'Hello world', '']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(1, 0), new Position(1, 0))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(false);

        assert.isNotNull(expression);
        if (expression !== null) {
            expect(expression.expression).to.be.equal('Hello world');
        }
    });

    test('Blank line becomes null expression', () => {
        let mockDocument = createMockDocument(['', 'Hello world', '']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(0, 0), new Position(0, 0))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(false);

        assert.isNull(expression);
    });

    test('Multi-line expression retrieved', () => {
        let mockDocument = createMockDocument(['', 'one', 'two', ' ', 'three']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(1, 0), new Position(1, 0))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(true);

        assert.isNotNull(expression);
        if (expression !== null) {
            expect(expression.expression).to.be.equal('one\r\ntwo');
        }
    });

    test('Multi-line expression from split selection', () => {
        let mockDocument = createMockDocument(['', 'one', 'two', ' ', 'three']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(1, 0), new Position(4, 5))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(true);

        assert.isNotNull(expression);
        if (expression !== null) {
            expect(expression.expression).to.be.equal('one\r\ntwo');
        }
    });

    test('Multi-line expression retrieved before selection', () => {
        let mockDocument = createMockDocument(['', 'one', 'two', ' ', 'three']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(2, 0), new Position(4, 2))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(true);

        assert.isNotNull(expression);
        if (expression !== null) {
            expect(expression.expression).to.be.equal('one\r\ntwo');
        }
    });

    test('Multi-line expression becomes null from blank line', () => {
        let mockDocument = createMockDocument(['', 'one', 'two', ' ', 'three']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(3, 0), new Position(3, 0))
        );

        let editor = new GPTEvalEditor(mockEditor.object);
        let expression = editor.getGPTExpressionUnderCursor(true);

        assert.isNull(expression);
    });
});
