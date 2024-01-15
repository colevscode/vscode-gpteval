import { Position, Selection } from 'vscode';
import * as TypeMoq from 'typemoq';
import {
    createMockDocument,
    createMockEditor,
    createMockCreateTextEditorDecorationType,
} from './mock';
import { Repl } from '../src/repl';
import { IHistory } from '../src/history';
import { Config } from '../src/config';
// import { assert } from 'chai';

suite('Repl', () => {
    test('Expression evaluated', async () => {
        let mockConfig = TypeMoq.Mock.ofType<Config>();
        let mockDocument = createMockDocument(['Foo', 'bar', '', 'baz']);
        let mockEditor = createMockEditor(
            mockDocument.object,
            new Selection(new Position(1, 0), new Position(1, 2))
        );
        let mockHistory = TypeMoq.Mock.ofType<IHistory>();
        let mockCreateTextEditorDecorationType =
            createMockCreateTextEditorDecorationType();

        mockDocument.setup((d) => d.fileName).returns(() => 'myfile.txt');

        let repl = new Repl(
            mockEditor.object,
            mockHistory.object,
            mockConfig.object,
            mockCreateTextEditorDecorationType.object
        );
        await repl.evaluate(true);

        mockHistory.verify(
            (h) => h.log(TypeMoq.It.isAny()),
            TypeMoq.Times.once()
        );
    });
});
