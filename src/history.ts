import { GPTEvalExpression } from './editor';
import { ILogger } from './logging';
import { Config } from './config';

/**
 * Logs the history of the session.
 */
export interface IHistory {
    getEvalCount(): number;
    log(expression: GPTEvalExpression): void;
}

export class History implements IHistory {
    private evalCount: number = 0;

    constructor(private logger: ILogger, private config: Config) {}

    public log(expression: GPTEvalExpression): void {
        this.evalCount++;
        if (this.config.showEvalCount()) {
            this.logger.log(
                `${this.config.evalCountPrefix()}${this.evalCount} `,
                false
            );
        }
        if (expression.result) {
            this.logger.log(expression.result);
        }
    }

    public getEvalCount(): number {
        return this.evalCount;
    }
}
