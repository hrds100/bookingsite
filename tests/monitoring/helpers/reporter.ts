import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

interface TestEntry {
  title: string;
  suite: string;
  status: 'passed' | 'failed' | 'timedOut' | 'skipped';
  duration: number;
  error?: string;
}

interface MonitoringReport {
  app: string;
  url: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  tests: TestEntry[];
}

class MonitoringReporter implements Reporter {
  private tests: TestEntry[] = [];
  private startTime = 0;

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteName = test.parent?.title || 'unknown';
    this.tests.push({
      title: test.title,
      suite: suiteName,
      status: result.status,
      duration: result.duration,
      error:
        result.status === 'failed'
          ? result.errors.map((e) => e.message).join('\n')
          : undefined,
    });
  }

  onEnd(result: FullResult) {
    const report: MonitoringReport = {
      app: 'bookingsite',
      url: process.env.TEST_BASE_URL || 'https://nfstay.app',
      timestamp: new Date().toISOString(),
      total: this.tests.length,
      passed: this.tests.filter((t) => t.status === 'passed').length,
      failed: this.tests.filter((t) => t.status === 'failed').length,
      skipped: this.tests.filter((t) => t.status === 'skipped').length,
      duration: Date.now() - this.startTime,
      tests: this.tests,
    };

    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const resultsDir = path.join(currentDir, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(resultsDir, 'latest.json'),
      JSON.stringify(report, null, 2)
    );

    const summary = `[bookingsite] ${report.passed}/${report.total} passed, ${report.failed} failed (${(report.duration / 1000).toFixed(1)}s)`;
    if (result.status === 'passed') {
      console.log(`✅ ${summary}`);
    } else {
      console.log(`❌ ${summary}`);
    }
  }
}

export default MonitoringReporter;
