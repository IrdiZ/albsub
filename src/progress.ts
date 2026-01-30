import cliProgress from 'cli-progress';
import chalk from 'chalk';

export class ProgressBar {
  private bar: cliProgress.SingleBar;
  private startTime: number = 0;

  constructor(total: number, label: string = 'Translating') {
    this.bar = new cliProgress.SingleBar({
      format: `${chalk.cyan(label)} |${chalk.green('{bar}')}| {percentage}% | {value}/{total} blocks | {speed} blocks/s | ETA: {eta_formatted}`,
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
    });
    this.bar.start(total, 0, { speed: '0.0' });
    this.startTime = Date.now();
  }

  update(value: number): void {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? (value / elapsed).toFixed(1) : '0.0';
    this.bar.update(value, { speed });
  }

  stop(): void {
    this.bar.stop();
  }
}
