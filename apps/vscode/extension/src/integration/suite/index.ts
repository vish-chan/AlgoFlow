import Mocha from 'mocha';

// VS Code loads this file inside the extension host and calls `run()`.
//
// esbuild bundles the tests into this same file, so there is no glob-the-directory step —
// but that means `suite`/`test` have to exist before the test module is evaluated.
// Mocha installs them on `globalThis` in response to `pre-require`, so emit that first and
// only then pull the test module in.

export function run(): Promise<void> {
    const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 120_000 });

    mocha.suite.emit(
        Mocha.Suite.constants.EVENT_FILE_PRE_REQUIRE,
        globalThis,
        'bundled-suite',
        mocha,
    );
    require('./extension.test');

    return new Promise((resolvePromise, reject) => {
        try {
            mocha.run(failures =>
                failures > 0 ? reject(new Error(`${failures} test(s) failed.`)) : resolvePromise(),
            );
        } catch (error) {
            reject(error);
        }
    });
}
